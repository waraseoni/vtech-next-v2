"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isStaffRole, requireSession } from "@/lib/auth";
import { recordActivity } from "@/lib/data/audit";
import { DataError } from "@/lib/data/errors";
import { jobInputFromForm } from "@/lib/data/job-input";
import {
  addJobImages,
  attachUploadedJobImages,
  bulkMoveJobSpot,
  bulkUpdateJobStatus as bulkUpdateJobStatusData,
  createJob,
  getJobsForClient,
  getJobsForInvoice,
  removeJobImage,
  softDeleteJob,
  updateJob,
  updateJobHeader,
  updateJobStatus,
  uploadJobImages,
} from "@/lib/data/jobs";
import {
  addRequiredPart,
  clearDeliveredSpots,
  createJobSpot,
  recordJobPayment,
  setJobSpot,
  setRequiredPartStatus,
} from "@/lib/data/job-operations";
import { getServiceCenterConfig } from "@/lib/data/service-center";
import { dtLocalToIST } from "@/lib/date";
import { parseLegacyClientId } from "@/lib/domain/client";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMode, PaymentType } from "@/lib/supabase/database.types";
import { canTransitionJobStatus, isJobStatus } from "@/lib/constants/status";
import { canDeleteRecords } from "@/lib/roles";

export type JobFormState = { error: string | null };
export type JobActionState = { error: string | null; ok?: boolean };
export type JobActionResult = {
  ok: boolean;
  error: string | null;
  updated?: number;
  id?: number;
};

export type SetJobStatusInput = {
  id: number;
  status: number;
  dateCompleted?: string | null;
};

export type BulkStatusInput = {
  ids: number[];
  status: number;
  dateCompleted?: string | null;
};

export type BulkSpotInput = {
  ids: number[];
  locationId: number | null;
  spot: string;
};

export type QuickJobInput = {
  clientId: number;
  mechanicId: number | null;
  item: string;
  fault: string;
  serviceTypeId?: number | null;
};

export type PaymentInput = {
  jobId: number;
  amount: number;
  discount: number;
  billNo: string;
  paymentDate: string;
  paymentType: PaymentType;
  paymentMode: PaymentMode;
  remarks: string;
};

const MAX_IMAGES = 5;

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof DataError) {
    return error.message.replace(/^[\w.]+:\s*/, "");
  }
  return fallback;
}

function parseId(value: FormDataEntryValue | null): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 0;
  return Number(value);
}

function imageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
    .slice(0, MAX_IMAGES);
}

function cleanIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((id): id is number => Number.isSafeInteger(id) && id > 0)
        .slice(0, 200),
    ),
  ];
}

function parseCompletedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const iso = dtLocalToIST(value);
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

async function assertTransitions(ids: number[], status: number) {
  if (!ids.length) return { ok: false as const, error: "Koi job chuniye." };
  if (!isJobStatus(status)) {
    return { ok: false as const, error: "Status sahi nahi hai." };
  }
  const supabase = await createClient();
  const result = await supabase
    .from("transaction_list")
    .select("id, status")
    .eq("del_status", 0)
    .in("id", ids);
  if (result.error) {
    return { ok: false as const, error: "Jobs load nahi huin." };
  }
  if (result.data.length !== ids.length) {
    return { ok: false as const, error: "Kuch jobs nahi mili." };
  }
  if (result.data.some((job) => !canTransitionJobStatus(job.status, status))) {
    return {
      ok: false as const,
      error: "Ek ya zyada jobs ke liye ye status allowed nahi hai.",
    };
  }
  return { ok: true as const };
}

export async function saveJobAction(
  _previous: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { error: "Is account ke paas job edit ka access nahi hai." };
  }

  const parsed = jobInputFromForm(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Job details sahi nahi hain.",
    };
  }

  const data = parsed.data;
  const files = imageFiles(formData);
  const input = {
    clientId: data.clientId,
    mechanicId: data.mechanicId ?? null,
    brandId: data.brandId ?? null,
    serviceTypeId: data.serviceTypeId,
    itemCategory: data.itemCategory ?? null,
    model: data.model ?? null,
    serialNo: data.serialNo ?? null,
    warrantyStatus: data.warrantyStatus ?? null,
    warrantyClaimNo: data.warrantyClaimNo ?? null,
    item: data.item,
    fault: data.fault,
    remark: data.remark ?? "",
    spot: data.spot ?? "",
    locationId: data.locationId ?? null,
    services: data.services,
    products: data.products,
    commissionAmount: data.commissionAmount,
  };

  const jobId = parseId(formData.get("id"));
  let uploads: Array<{ url: string; path: string }> = [];
  if (files.length) {
    try {
      uploads = await uploadJobImages(files);
    } catch (error) {
      return { error: friendlyError(error, "Job images upload nahi hui.") };
    }
  }

  let targetId = jobId;
  let jobCode: string | null = null;
  try {
    if (jobId > 0) {
      await updateJob(jobId, input);
      if (uploads.length) await attachUploadedJobImages(jobId, uploads);
    } else {
      const created = await createJob({
        ...input,
        manualJobId: data.manualJobId,
        userId: session.profile.mechanic_id ?? 0,
      });
      targetId = created.id;
      jobCode = created.code;
      if (uploads.length) await attachUploadedJobImages(created.id, uploads);
    }
  } catch (error) {
    return {
      error: friendlyError(error, "Job save nahi hua. Dobara try karein."),
    };
  }

  await recordActivity(session, {
    module: "Jobs",
    action: jobId > 0 ? "update" : "create",
    metaId: targetId,
    details: [jobCode, data.item].filter(Boolean).join(" · "),
  });

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${targetId}`);
  redirect(`/jobs/${targetId}`);
}

export async function updateJobStatusAction(
  _previous: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { error: "Status change ka access nahi hai." };
  }

  const id = parseId(formData.get("id"));
  const statusRaw = Number(formData.get("status"));
  if (!id || !isJobStatus(statusRaw)) {
    return { error: "Status request sahi nahi hai." };
  }

  const supabase = await createClient();
  const current = await supabase
    .from("transaction_list")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (current.error || !current.data) {
    return { error: "Job nahi mila." };
  }
  if (!canTransitionJobStatus(current.data.status, statusRaw)) {
    return { error: "Ye status change allowed nahi hai." };
  }

  try {
    await updateJobStatus(id, statusRaw);
  } catch (error) {
    return { error: friendlyError(error, "Status update nahi hua.") };
  }

  await recordActivity(session, {
    module: "Jobs",
    action: "status",
    metaId: id,
    details: `${current.data.status} → ${statusRaw}`,
  });

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export async function deleteJobAction(
  _previous: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  const session = await requireSession();
  if (!canDeleteRecords(session.profile.role)) {
    return { error: "Delete sirf admin/developer kar sakta hai." };
  }

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Job id sahi nahi hai." };

  try {
    await softDeleteJob(id);
  } catch (error) {
    return { error: friendlyError(error, "Job delete nahi hua.") };
  }

  await recordActivity(session, {
    module: "Jobs",
    action: "delete",
    metaId: id,
    details: "Soft delete (del_status=1)",
  });

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  redirect("/jobs");
}

export async function deleteJobImageAction(
  _previous: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { error: "Image delete ka access nahi hai." };
  }

  const imageId = parseId(formData.get("image_id"));
  const jobId = parseId(formData.get("id"));
  if (!imageId || !jobId) return { error: "Image request sahi nahi hai." };

  try {
    await removeJobImage(imageId);
  } catch (error) {
    return { error: friendlyError(error, "Image delete nahi hui.") };
  }

  await recordActivity(session, {
    module: "Jobs",
    action: "delete",
    metaId: jobId,
    details: `Image #${imageId} hatayi`,
  });

  revalidatePath(`/jobs/${jobId}`);
  return { error: null, ok: true };
}

export async function addJobImagesAction(
  _previous: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { error: "Image upload ka access nahi hai." };
  }

  const jobId = parseId(formData.get("id"));
  const files = imageFiles(formData);
  if (!jobId) return { error: "Job id sahi nahi hai." };
  if (!files.length) return { error: "Koi image chuniye." };

  try {
    await addJobImages(jobId, files);
  } catch (error) {
    return { error: friendlyError(error, "Images upload nahi hui.") };
  }

  await recordActivity(session, {
    module: "Jobs",
    action: "upload",
    metaId: jobId,
    details: `${files.length} image upload`,
  });

  revalidatePath(`/jobs/${jobId}`);
  return { error: null, ok: true };
}

/** Detail/status modal + list quick status — one validated mutation path. */
export async function setJobStatusAction(
  input: SetJobStatusInput,
): Promise<JobActionResult> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Status change ka access nahi hai." };
  }
  if (!Number.isSafeInteger(input.id) || input.id <= 0) {
    return { ok: false, error: "Job id sahi nahi hai." };
  }
  const allowed = await assertTransitions([input.id], input.status);
  if (!allowed.ok) return { ok: false, error: allowed.error };

  const completedAt = parseCompletedAt(input.dateCompleted);
  try {
    await updateJobStatus(input.id, input.status, completedAt);
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Status update nahi hua."),
    };
  }

  await recordActivity(session, {
    module: "Jobs",
    action: "status",
    metaId: input.id,
    details:
      completedAt && input.status === 5
        ? `Status ${input.status} · delivery ${completedAt}`
        : `Status → ${input.status}`,
  });

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${input.id}`);
  revalidatePath("/dashboard");
  return { ok: true, error: null };
}

export async function bulkSetJobStatusAction(
  input: BulkStatusInput,
): Promise<JobActionResult> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Bulk status ka access nahi hai." };
  }
  const ids = cleanIds(input.ids);
  const allowed = await assertTransitions(ids, input.status);
  if (!allowed.ok) return { ok: false, error: allowed.error };

  try {
    const updated = await bulkUpdateJobStatusData(
      ids,
      input.status,
      parseCompletedAt(input.dateCompleted),
    );
    await recordActivity(session, {
      module: "Jobs",
      action: "status",
      metaId: ids[0],
      details: `Bulk status ${input.status} · ${updated} jobs`,
    });
    revalidatePath("/jobs");
    revalidatePath("/dashboard");
    return { ok: true, error: null, updated };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Bulk status update nahi hua."),
    };
  }
}

export async function bulkMoveJobSpotAction(
  input: BulkSpotInput,
): Promise<JobActionResult> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Spot change ka access nahi hai." };
  }
  const ids = cleanIds(input.ids);
  if (!ids.length) return { ok: false, error: "Koi job chuniye." };
  try {
    const updated = await bulkMoveJobSpot(
      ids,
      input.locationId,
      input.spot ?? "",
    );
    await recordActivity(session, {
      module: "Jobs",
      action: "update",
      metaId: ids[0],
      details: `Bulk spot → ${input.spot || "clear"} · ${updated} jobs`,
    });
    revalidatePath("/jobs");
    return { ok: true, error: null, updated };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Spot move nahi hua."),
    };
  }
}

export async function clearDeliveredSpotsAction(): Promise<JobActionResult> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Spot cleanup ka access nahi hai." };
  }
  try {
    const updated = await clearDeliveredSpots();
    await recordActivity(session, {
      module: "Jobs",
      action: "update",
      details: `Delivered spots clear · ${updated} jobs`,
    });
    revalidatePath("/jobs");
    return { ok: true, error: null, updated };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Delivered spots clear nahi hue."),
    };
  }
}

export async function createJobSpotAction(
  label: string,
): Promise<JobActionResult & { spot?: { id: number; label: string } }> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Spot create ka access nahi hai." };
  }
  try {
    const spot = await createJobSpot(label);
    revalidatePath("/jobs");
    revalidatePath("/jobs/new");
    return { ok: true, error: null, id: spot.id, spot };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Spot create nahi hua."),
    };
  }
}

export async function setJobSpotAction(input: {
  id: number;
  locationId: number | null;
  spot: string;
}): Promise<JobActionResult> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Spot change ka access nahi hai." };
  }
  if (!Number.isSafeInteger(input.id) || input.id <= 0) {
    return { ok: false, error: "Job id sahi nahi hai." };
  }
  try {
    await setJobSpot(input.id, input.locationId, input.spot);
    await recordActivity(session, {
      module: "Jobs",
      action: "update",
      metaId: input.id,
      details: `Spot → ${input.spot || "clear"}`,
    });
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${input.id}`);
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Spot save nahi hua.") };
  }
}

export async function recordJobPaymentAction(
  input: PaymentInput,
): Promise<JobActionResult> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Payment add ka access nahi hai." };
  }
  if (!Number.isSafeInteger(input.jobId) || input.jobId <= 0) {
    return { ok: false, error: "Job id sahi nahi hai." };
  }
  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    !Number.isFinite(input.discount) ||
    input.discount < 0 ||
    input.discount > input.amount
  ) {
    return { ok: false, error: "Valid amount aur discount daalein." };
  }

  const supabase = await createClient();
  const job = await supabase
    .from("transaction_list")
    .select("job_id, client_name")
    .eq("id", input.jobId)
    .eq("del_status", 0)
    .maybeSingle();
  if (job.error || !job.data) {
    return { ok: false, error: "Job nahi mila." };
  }
  const clientId = parseLegacyClientId(job.data.client_name);
  if (!clientId) {
    return { ok: false, error: "Walk-in job ke liye client payment nahi." };
  }

  try {
    const payment = await recordJobPayment({
      jobId: input.jobId,
      clientId,
      amount: input.amount,
      discount: input.discount,
      billNo: input.billNo,
      paymentDate: input.paymentDate,
      paymentType: input.paymentType,
      paymentMode: input.paymentMode,
      remarks: input.remarks,
      jobReference: job.data.job_id ?? String(input.jobId),
    });
    await recordActivity(session, {
      module: "Jobs",
      action: "payment",
      metaId: input.jobId,
      details: `Job #${job.data.job_id ?? input.jobId} · ₹${input.amount} (${input.paymentMode}, ${input.paymentType})`,
    });
    revalidatePath(`/jobs/${input.jobId}`);
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients/payments");
    revalidatePath("/dashboard");
    return { ok: true, error: null, id: payment.id };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Payment save nahi hua."),
    };
  }
}

export async function addRequiredPartAction(input: {
  jobId: number;
  productName: string;
  qtyNeeded: number;
  sourceName: string;
  phone: string;
  eta: string;
  remark: string;
}): Promise<JobActionResult> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Required parts ka access nahi hai." };
  }
  if (
    !Number.isSafeInteger(input.jobId) ||
    input.jobId <= 0 ||
    !input.productName?.trim() ||
    !Number.isFinite(input.qtyNeeded) ||
    input.qtyNeeded <= 0
  ) {
    return { ok: false, error: "Saman aur quantity zaroori hai." };
  }
  try {
    const part = await addRequiredPart({
      jobId: input.jobId,
      productName: input.productName,
      qtyNeeded: Math.floor(input.qtyNeeded),
      sourceName: input.sourceName,
      phone: input.phone,
      eta: input.eta,
      remark: input.remark,
      createdBy: session.profile.mechanic_id,
    });
    await recordActivity(session, {
      module: "Jobs",
      action: "create",
      metaId: input.jobId,
      details: `Required part #${part.id} added`,
    });
    revalidatePath(`/jobs/${input.jobId}`);
    return { ok: true, error: null, id: part.id };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Required part save nahi hua."),
    };
  }
}

export async function setRequiredPartStatusAction(input: {
  id: number;
  jobId: number;
  status: number;
  qtyNeeded: number;
}): Promise<JobActionResult> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Required parts ka access nahi hai." };
  }
  if (
    ![0, 1, 2].includes(input.status) ||
    !Number.isSafeInteger(input.id) ||
    !Number.isSafeInteger(input.jobId) ||
    input.qtyNeeded <= 0
  ) {
    return { ok: false, error: "Required part request sahi nahi hai." };
  }
  try {
    await setRequiredPartStatus(input.id, input.status, input.qtyNeeded);
    revalidatePath(`/jobs/${input.jobId}`);
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Required part update nahi hua."),
    };
  }
}

/** V1-style quick create: zero-amount pending job, then straight to edit. */
export async function quickCreateJobAction(
  input: QuickJobInput,
): Promise<JobActionResult> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Quick create ka access nahi hai." };
  }
  if (
    !Number.isSafeInteger(input.clientId) ||
    input.clientId <= 0 ||
    input.item.trim().length < 2 ||
    input.fault.trim().length < 2
  ) {
    return { ok: false, error: "Client, item aur fault zaroori hai." };
  }
  const config = await getServiceCenterConfig();
  const serviceTypeId = input.serviceTypeId ?? config.defaultServiceTypeId;
  if (!serviceTypeId) {
    return { ok: false, error: "Service type configured nahi hai." };
  }
  try {
    const created = await createJob({
      userId: session.profile.mechanic_id ?? 0,
      clientId: input.clientId,
      mechanicId: input.mechanicId ?? null,
      brandId: config.defaultBrandId,
      serviceTypeId,
      item: input.item.trim(),
      fault: input.fault.trim(),
      remark: "",
      spot: "",
      services: [],
      products: [],
      commissionAmount: 0,
      status: 0,
    });
    await recordActivity(session, {
      module: "Jobs",
      action: "create",
      metaId: created.id,
      details: `Quick create · ${created.code}`,
    });
    revalidatePath("/jobs");
    return { ok: true, error: null, id: created.id };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Quick job create nahi hua."),
    };
  }
}

export async function bulkCreateJobsAction(input: {
  clientId: number;
  mechanicId: number | null;
  rows: Array<{ item: string; fault: string }>;
}): Promise<JobActionResult> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Bulk entry ka access nahi hai." };
  }
  const rows = (input.rows ?? []).slice(0, 50);
  const valid = rows.filter(
    (row) => row.item?.trim().length >= 2 && row.fault?.trim().length >= 2,
  );
  if (!Number.isSafeInteger(input.clientId) || input.clientId <= 0) {
    return { ok: false, error: "Client select karo." };
  }
  if (!valid.length) {
    return { ok: false, error: "Kam se kam ek valid row daalein." };
  }
  const config = await getServiceCenterConfig();
  if (!config.defaultServiceTypeId) {
    return { ok: false, error: "Service type configured nahi hai." };
  }
  const createdIds: number[] = [];
  try {
    for (const row of valid) {
      const created = await createJob({
        userId: session.profile.mechanic_id ?? 0,
        clientId: input.clientId,
        mechanicId: input.mechanicId ?? null,
        brandId: config.defaultBrandId,
        serviceTypeId: config.defaultServiceTypeId,
        item: row.item.trim(),
        fault: row.fault.trim(),
        remark: "",
        spot: "",
        services: [],
        products: [],
        commissionAmount: 0,
        status: 0,
      });
      createdIds.push(created.id);
    }
    await recordActivity(session, {
      module: "Jobs",
      action: "create",
      metaId: createdIds[0],
      details: `Bulk entry · ${createdIds.length} jobs`,
    });
    revalidatePath("/jobs");
    return { ok: true, error: null, updated: createdIds.length };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Bulk jobs create nahi hue."),
    };
  }
}

export async function bulkEditJobsAction(input: {
  rows: Array<{
    id: number;
    item: string;
    fault: string;
    mechanicId: number | null;
    clientId: number | null;
    targetClientId: number | null;
    remark: string;
  }>;
}): Promise<JobActionResult> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Bulk edit ka access nahi hai." };
  }
  const rows = (input.rows ?? []).slice(0, 200);
  if (!rows.length) return { ok: false, error: "Koi row nahi." };
  if (
    rows.some(
      (row) =>
        !Number.isSafeInteger(row.id) ||
        row.id <= 0 ||
        row.item.trim().length < 2 ||
        row.fault.trim().length < 2,
    )
  ) {
    return { ok: false, error: "Item aur fault sab rows me zaroori hai." };
  }
  try {
    for (const row of rows) {
      await updateJobHeader(row.id, {
        clientId: row.targetClientId ?? row.clientId ?? 0,
        mechanicId: row.mechanicId ?? null,
        item: row.item,
        fault: row.fault,
        remark: row.remark ?? "",
      });
    }
    await recordActivity(session, {
      module: "Jobs",
      action: "update",
      metaId: rows[0].id,
      details: `Bulk edit · ${rows.length} jobs`,
    });
    revalidatePath("/jobs");
    for (const row of rows.slice(0, 50)) {
      revalidatePath(`/jobs/${row.id}`);
    }
    return { ok: true, error: null, updated: rows.length };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Bulk edit save nahi hua."),
    };
  }
}

/** Bulk edit ke liye ek client ke jobs load karein. */
export async function getJobsForClientAction(clientId: number): Promise<{
  ok: boolean;
  error: string | null;
  rows: Awaited<ReturnType<typeof getJobsForClient>>;
}> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Access nahi hai.", rows: [] };
  }
  if (!Number.isSafeInteger(clientId) || clientId <= 0) {
    return { ok: false, error: "Client chuniye.", rows: [] };
  }
  try {
    return { ok: true, error: null, rows: await getJobsForClient(clientId) };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Jobs load nahi hue."),
      rows: [],
    };
  }
}

/** Combined invoice / estimate ke liye selected jobs ya client ke jobs. */
export async function getJobsForInvoiceAction(
  clientId: number | null,
  ids: number[] = [],
): Promise<{
  ok: boolean;
  error: string | null;
  rows: Awaited<ReturnType<typeof getJobsForInvoice>>;
}> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { ok: false, error: "Access nahi hai.", rows: [] };
  }
  const jobIds = cleanIds(ids);
  const validClient =
    typeof clientId === "number" &&
    Number.isSafeInteger(clientId) &&
    clientId > 0;
  if (!jobIds.length && !validClient) {
    return { ok: false, error: "Client ya jobs chuniye.", rows: [] };
  }
  try {
    return {
      ok: true,
      error: null,
      rows: await getJobsForInvoice(validClient ? clientId : null, jobIds),
    };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Invoice jobs load nahi hue."),
      rows: [],
    };
  }
}
