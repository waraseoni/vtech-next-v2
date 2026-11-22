import "server-only";

import { assertOk, unwrap } from "@/lib/data/errors";
import { dtLocalToIST, istDayRange } from "@/lib/date";
import type { PaymentMode, PaymentType } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type JobSpot = {
  id: number;
  label: string;
  /** Non-deleted jobs currently parked on this spot. */
  occupied: number;
};

export type JobStats = {
  total: number;
  pending: number;
  progress: number;
  completed: number;
  totalAmt: number;
};

export type StaleJob = {
  id: number;
  jobId: string | null;
  item: string;
  spot: string;
  days: number;
};

export type JobActivityEntry = {
  id: number;
  label: string;
  details: string | null;
  date: string;
  module: string | null;
};

function spotLabel(row: {
  label: string | null;
  zone: string;
  rack: string;
  bin: string;
  box: string;
  id: number;
}): string {
  if (row.label?.trim()) return row.label.trim();
  const parts = [row.zone, row.rack, row.bin, row.box]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return parts.length ? parts.join(" / ") : `Spot #${row.id}`;
}

/** Job spots (locations.kind='job') with live occupancy, emptiest first. */
export async function getJobSpots(): Promise<JobSpot[]> {
  const supabase = await createClient();
  const [spotsRes, jobsRes] = await Promise.all([
    supabase
      .from("locations")
      .select("id, label, zone, rack, bin, box, delete_flag")
      .eq("kind", "job")
      .order("label"),
    supabase
      .from("transaction_list")
      .select("location_id")
      .eq("del_status", 0)
      .not("location_id", "is", null),
  ]);
  const spots = unwrap(spotsRes, "jobs.spots");
  const jobs = unwrap(jobsRes, "jobs.spotOccupancy");
  const counts = new Map<number, number>();
  for (const job of jobs) {
    if (job.location_id)
      counts.set(job.location_id, (counts.get(job.location_id) ?? 0) + 1);
  }

  return spots
    .filter((spot) => spot.delete_flag === 0)
    .map((spot) => ({
      id: spot.id,
      label: spotLabel(spot),
      occupied: counts.get(spot.id) ?? 0,
    }))
    .sort((a, b) => a.occupied - b.occupied || a.label.localeCompare(b.label));
}

export async function createJobSpot(label: string): Promise<JobSpot> {
  const clean = label.trim().slice(0, 120);
  if (!clean) throw new Error("Spot ka naam zaroori hai.");
  const supabase = await createClient();
  const created = unwrap(
    await supabase
      .from("locations")
      .insert({
        kind: "job",
        label: clean,
        zone: "",
        rack: "",
        bin: "",
        box: "",
        status: 1,
        delete_flag: 0,
      })
      .select("id, label, zone, rack, bin, box")
      .single(),
    "jobs.createSpot",
  );
  return { id: created.id, label: spotLabel(created), occupied: 0 };
}

/** Dual write: structured `location_id` plus legacy readable `uniq_id`. */
export async function setJobSpot(
  jobId: number,
  locationId: number | null,
  spot: string,
) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("transaction_list")
      .update({
        location_id: locationId,
        uniq_id: locationId ? spot.trim().slice(0, 120) : "",
        date_updated: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select("id")
      .single(),
    "jobs.setSpot",
  );
}

export async function clearDeliveredSpots(): Promise<number> {
  const supabase = await createClient();
  const delivered = unwrap(
    await supabase
      .from("transaction_list")
      .select("id")
      .eq("del_status", 0)
      .eq("status", 5)
      .not("location_id", "is", null),
    "jobs.deliveredSpots",
  );
  if (!delivered.length) return 0;
  unwrap(
    await supabase
      .from("transaction_list")
      .update({
        location_id: null,
        uniq_id: "",
        date_updated: new Date().toISOString(),
      })
      .in(
        "id",
        delivered.map((job) => job.id),
      ),
    "jobs.clearSpots",
  );
  return delivered.length;
}

export type JobStatsFilters = {
  search?: string;
  from?: string;
  to?: string;
  hideDelivered?: boolean;
  status?: number | null;
  spotId?: number | null;
};

function safeTerm(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/[,()*%\\]/g, " ")
    .slice(0, 60);
}

/** RPC-backed Quick Stats — one aggregate row, no full-dataset transfer. */
export async function getJobStats(filters: JobStatsFilters): Promise<JobStats> {
  const supabase = await createClient();
  const result = await supabase.rpc("get_jobs_stats", {
    p_term: safeTerm(filters.search) || null,
    p_date_from: filters.from || null,
    p_date_to: filters.to || null,
    p_hide_delivered: filters.hideDelivered ?? false,
    p_status: filters.status ?? null,
    p_spot: filters.spotId ? String(filters.spotId) : null,
  });
  if (result.error) {
    console.warn(`jobs.stats: ${result.error.message}`);
    return { total: 0, pending: 0, progress: 0, completed: 0, totalAmt: 0 };
  }
  const stats = result.data;
  return {
    total: Number(stats?.total) || 0,
    pending: Number(stats?.pending) || 0,
    progress: Number(stats?.progress) || 0,
    completed: Number(stats?.completed) || 0,
    totalAmt: Number(stats?.totalAmt) || 0,
  };
}

/** Done/Paid jobs sitting on a spot for 7+ days (dual-era log aware). */
export async function getStaleJobs(): Promise<StaleJob[]> {
  const supabase = await createClient();
  const result = await supabase.rpc("get_stale_jobs", {
    p_days: 7,
    p_limit: 50,
  });
  if (result.error) {
    console.warn(`jobs.stale: ${result.error.message}`);
    return [];
  }
  const rows = result.data;
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    id: Number(row.id),
    jobId: row.job_id,
    item: row.item,
    spot: row.uniq_id,
    days: Number(row.days) || 0,
  }));
}

export async function getJobNeighbors(jobId: string): Promise<{
  previous: { id: number; label: string } | null;
  next: { id: number; label: string } | null;
}> {
  const supabase = await createClient();
  const columns = "id, job_id, item";
  const [prevRes, nextRes] = await Promise.all([
    supabase
      .from("transaction_list")
      .select(columns)
      .eq("del_status", 0)
      .lt("job_id", jobId)
      .order("job_id", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("transaction_list")
      .select(columns)
      .eq("del_status", 0)
      .gt("job_id", jobId)
      .order("job_id", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  assertOk(prevRes, "jobs.previous");
  assertOk(nextRes, "jobs.next");
  const map = (
    row: { id: number; job_id: string | null; item: string } | null,
  ) =>
    row
      ? { id: row.id, label: `#${row.job_id ?? row.id} · ${row.item}` }
      : null;
  return { previous: map(prevRes.data), next: map(nextRes.data) };
}

const STATUS_LABELS: Record<string, string> = {
  create: "Job created",
  update: "Job updated",
  status: "Status updated",
  delete: "Job deleted",
  upload: "Photos updated",
  payment: "Payment added",
};

/** Existing audit rows for one job — both modern `Jobs` and legacy PHP logs. */
export async function getJobActivity(
  jobId: number,
  jobCode: string | null,
): Promise<JobActivityEntry[]> {
  const supabase = await createClient();
  const keys = [
    ...new Set([String(jobId), jobCode].filter(Boolean)),
  ] as string[];
  if (!keys.length) return [];
  const columns =
    "id, user_id, action, module, meta_id, details, date_created, geo_lat, geo_lng";
  const [modern, legacy] = await Promise.all([
    supabase
      .from("activity_logs")
      .select(columns)
      .eq("module", "Jobs")
      .in("meta_id", keys),
    supabase
      .from("activity_logs")
      .select(columns)
      .eq("module", "Transactions")
      .eq("action", "Transaction Status Changed")
      .eq("meta_id", String(jobId)),
  ]);
  assertOk(modern, "jobs.activity");
  assertOk(legacy, "jobs.activityLegacy");

  return [...(modern.data ?? []), ...(legacy.data ?? [])]
    .map((row) => ({
      id: row.id,
      label:
        row.action === "create" && row.module === "Jobs"
          ? "Job Created"
          : (STATUS_LABELS[row.action ?? ""] ?? row.action ?? "Activity"),
      details: row.details,
      date: row.date_created ?? "",
      module: row.module,
    }))
    .filter((entry) => entry.date)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getClientContact(clientId: number): Promise<string> {
  const supabase = await createClient();
  const result = await supabase
    .from("client_list")
    .select("contact")
    .eq("id", clientId)
    .maybeSingle();
  assertOk(result, "jobs.clientContact");
  return result.data?.contact ?? "";
}

export type JobPaymentInput = {
  jobId: number;
  clientId: number;
  amount: number;
  discount: number;
  billNo: string;
  paymentDate: string;
  paymentType: PaymentType;
  paymentMode: PaymentMode;
  remarks: string;
  jobReference: string;
};

export async function recordJobPayment(input: JobPaymentInput) {
  const supabase = await createClient();
  const paymentDate = /^\d{4}-\d{2}-\d{2}$/.test(input.paymentDate)
    ? istDayRange(input.paymentDate).start
    : dtLocalToIST(input.paymentDate);
  const netAmount = Math.max(0, input.amount - input.discount);
  return unwrap(
    await supabase
      .from("client_payments")
      .insert({
        client_id: input.clientId,
        job_id: input.jobReference || String(input.jobId),
        amount: input.amount,
        discount: input.discount,
        net_amount: netAmount,
        payment_mode: input.paymentMode,
        payment_type: input.paymentType,
        bill_no: input.billNo || null,
        payment_date: paymentDate,
        remarks: input.remarks || null,
      })
      .select("id")
      .single(),
    "jobs.recordPayment",
  );
}

export type RequiredPartInput = {
  jobId: number;
  productName: string;
  qtyNeeded: number;
  sourceName: string;
  phone: string;
  eta: string;
  remark: string;
  createdBy: number | null;
};

export type RequiredPart = {
  id: number;
  productName: string;
  qtyNeeded: number;
  qtyReceived: number;
  status: number;
  sourceName: string | null;
  phone: string | null;
  eta: string | null;
  remark: string | null;
};

/** Fail-soft: older deployments may not have the required-parts migration. */
export async function getRequiredParts(jobId: number): Promise<RequiredPart[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_required_parts")
    .select(
      "id, product_name, qty_needed, qty_received, status, source_name, phone, eta, remark",
    )
    .eq("transaction_id", jobId)
    .order("id");
  if (error) {
    console.warn(`jobs.requiredParts: ${error.message}`);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    productName: row.product_name,
    qtyNeeded: row.qty_needed,
    qtyReceived: row.qty_received,
    status: row.status,
    sourceName: row.source_name,
    phone: row.phone,
    eta: row.eta,
    remark: row.remark,
  }));
}

export async function addRequiredPart(input: RequiredPartInput) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("job_required_parts")
      .insert({
        transaction_id: input.jobId,
        product_name: input.productName.trim().slice(0, 200),
        qty_needed: input.qtyNeeded,
        qty_received: 0,
        status: 0,
        source_name: input.sourceName || null,
        phone: input.phone || null,
        eta: input.eta || null,
        remark: input.remark || null,
        created_by: input.createdBy,
      })
      .select("id")
      .single(),
    "jobs.addRequiredPart",
  );
}

export async function setRequiredPartStatus(
  id: number,
  status: number,
  qtyNeeded: number,
) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("job_required_parts")
      .update({
        status,
        qty_received: status === 2 ? qtyNeeded : 0,
        date_updated: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id")
      .single(),
    "jobs.setRequiredPartStatus",
  );
}
