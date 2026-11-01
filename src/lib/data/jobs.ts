import "server-only";

import { assertOk, unwrap, unwrapMaybe } from "@/lib/data/errors";
import { getClientNames } from "@/lib/data/clients";
import { removeMediaImages, uploadMediaImage } from "@/lib/data/storage";
import { istDayRange, todayIST } from "@/lib/date";
import {
  formatJobCode,
  jobCodePrefix,
  nextJobCodeSequence,
} from "@/lib/domain/codes";
import { parseLegacyClientId } from "@/lib/domain/client";
import { lineTotal, roundMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export type JobFilters = {
  search?: string;
  status?: number;
  mechanicId?: number;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type JobListItem = {
  id: number;
  jobId: string | null;
  code: string;
  clientId: number | null;
  clientName: string;
  item: string;
  fault: string;
  amount: number;
  status: number;
  mechanicId: number | null;
  mechanicName: string;
  dateCreated: string;
  dateCompleted: string | null;
};

export type JobsPage = {
  rows: JobListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type JobServiceLine = { serviceId: number; name: string; price: number };
export type JobProductLine = {
  productId: number | null;
  name: string;
  qty: number;
  price: number;
};

export type CreateJobInput = {
  userId: number;
  clientId: number;
  mechanicId: number | null;
  item: string;
  fault: string;
  remark: string;
  spot?: string | null;
  locationId?: number | null;
  services: JobServiceLine[];
  products: JobProductLine[];
  commissionAmount?: number | null;
  status?: number;
};

export type UpdateJobInput = Omit<CreateJobInput, "userId">;

const JOB_COLUMNS =
  "id, job_id, code, client_name, item, fault, remark, uniq_id, amount, mechanic_amount, mechanic_commission_amount, status, mechanic_id, date_created, date_updated, date_completed, location_id";

function safeSearchTerm(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/[,()*%\\]/g, " ")
    .slice(0, 60);
}

export async function getJobsPage(filters: JobFilters = {}): Promise<JobsPage> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 50));
  const term = safeSearchTerm(filters.search);

  let query = supabase
    .from("transaction_list")
    .select(JOB_COLUMNS, { count: "exact" })
    .eq("del_status", 0)
    .order("date_created", { ascending: false });

  if (typeof filters.status === "number") {
    query = query.eq("status", filters.status);
  }
  if (typeof filters.mechanicId === "number") {
    query = query.eq("mechanic_id", filters.mechanicId);
  }
  if (filters.from) {
    query = query.gte("date_created", istDayRange(filters.from).start);
  }
  if (filters.to) {
    query = query.lte("date_created", istDayRange(filters.to).end);
  }
  if (term) {
    query = query.or(
      `job_id.ilike.%${term}%,code.ilike.%${term}%,item.ilike.%${term}%,fault.ilike.%${term}%`,
    );
  }

  const start = (page - 1) * pageSize;
  const result = await query.range(start, start + pageSize - 1);
  const rows = unwrap(result, "jobs.list");

  const [clientNames, mechanicNames] = await Promise.all([
    getClientNames(
      rows
        .map((row) => parseLegacyClientId(row.client_name))
        .filter((id): id is number => id !== null),
    ),
    getMechanicNames(
      rows
        .map((row) => row.mechanic_id)
        .filter((id): id is number => id !== null),
    ),
  ]);

  return {
    rows: rows.map((row) => {
      const clientId = parseLegacyClientId(row.client_name);
      return {
        id: row.id,
        jobId: row.job_id,
        code: row.code,
        clientId,
        clientName:
          clientNames.get(clientId ?? -1) ??
          (clientId ? `Client #${clientId}` : "Walk-in"),
        item: row.item,
        fault: row.fault,
        amount: row.amount,
        status: row.status,
        mechanicId: row.mechanic_id,
        mechanicName: mechanicNames.get(row.mechanic_id ?? -1) ?? "—",
        dateCreated: row.date_created,
        dateCompleted: row.date_completed,
      };
    }),
    total: result.count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getJobDetail(id: number) {
  const supabase = await createClient();

  const [jobRes, servicesRes, productsRes, imagesRes] = await Promise.all([
    supabase
      .from("transaction_list")
      .select(JOB_COLUMNS)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("transaction_services")
      .select("service_id, service_name, price")
      .eq("transaction_id", id),
    supabase
      .from("transaction_products")
      .select("id, product_id, product_name, qty, price")
      .eq("transaction_id", id)
      .order("id"),
    supabase
      .from("transaction_images")
      .select("id, image_path, date_created")
      .eq("transaction_id", id)
      .order("date_created"),
  ]);

  const job = unwrapMaybe(jobRes, "jobs.detail");
  if (!job) return null;

  const clientId = parseLegacyClientId(job.client_name);
  const [clientNames, mechanicNames, location] = await Promise.all([
    getClientNames(clientId ? [clientId] : []),
    getMechanicNames(job.mechanic_id ? [job.mechanic_id] : []),
    job.location_id
      ? supabase
          .from("locations")
          .select("id, label, zone, rack, bin, box")
          .eq("id", job.location_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    job: {
      ...job,
      clientId,
      clientName:
        clientNames.get(clientId ?? -1) ??
        (clientId ? `Client #${clientId}` : "Walk-in"),
      mechanicName: mechanicNames.get(job.mechanic_id ?? -1) ?? "—",
    },
    services: unwrap(servicesRes, "jobs.services"),
    products: unwrap(productsRes, "jobs.products"),
    images: unwrap(imagesRes, "jobs.images"),
    location: unwrapMaybe(location, "jobs.location"),
  };
}

export async function peekNextJobId(): Promise<number> {
  const supabase = await createClient();
  return unwrap(await supabase.rpc("peek_next_job_id"), "jobs.peekId");
}

export async function createJob(input: CreateJobInput) {
  const supabase = await createClient();
  const jobId = unwrap(await supabase.rpc("next_job_id"), "jobs.nextId");
  const today = todayIST();
  const codes = await getTodayJobCodes(today);
  const code = await claimUniqueJobCode(today, codes, jobId);

  const totals = jobTotals(input);
  const header = unwrap(
    await supabase
      .from("transaction_list")
      .insert({
        user_id: input.userId,
        mechanic_id: input.mechanicId,
        code,
        job_id: String(jobId),
        client_name: String(input.clientId),
        fault: input.fault,
        remark: input.remark,
        item: input.item,
        uniq_id: input.spot?.trim() ?? "",
        amount: totals.total,
        mechanic_amount: input.commissionAmount ?? 0,
        mechanic_commission_amount: input.commissionAmount ?? 0,
        del_status: 0,
        status: input.status ?? 0,
        location_id: input.locationId ?? null,
      })
      .select("id, job_id, code")
      .single(),
    "jobs.create",
  );

  try {
    await Promise.all([
      input.services.length
        ? insertJobServices(header.id, input.services)
        : null,
      input.products.length
        ? insertJobProducts(header.id, input.products)
        : null,
    ]);
  } catch (error) {
    await supabase.from("transaction_list").delete().eq("id", header.id);
    throw error;
  }

  await removeDuplicateJobCode(header.id, today, code);
  return header;
}

export async function updateJob(id: number, input: UpdateJobInput) {
  const supabase = await createClient();
  const totals = jobTotals(input);

  unwrap(
    await supabase
      .from("transaction_list")
      .update({
        mechanic_id: input.mechanicId,
        client_name: String(input.clientId),
        fault: input.fault,
        remark: input.remark,
        item: input.item,
        uniq_id: input.spot?.trim() ?? "",
        amount: totals.total,
        mechanic_amount: input.commissionAmount ?? 0,
        mechanic_commission_amount: input.commissionAmount ?? 0,
        location_id: input.locationId ?? null,
        date_updated: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id")
      .single(),
    "jobs.update",
  );

  await Promise.all([
    supabase.from("transaction_services").delete().eq("transaction_id", id),
    supabase.from("transaction_products").delete().eq("transaction_id", id),
  ]);
  await Promise.all([
    input.services.length ? insertJobServices(id, input.services) : null,
    input.products.length ? insertJobProducts(id, input.products) : null,
  ]);

  return { id };
}

export async function updateJobStatus(id: number, status: number) {
  const supabase = await createClient();
  const completed =
    status === 2 || status === 5 ? new Date().toISOString() : null;

  const result = await supabase
    .from("transaction_list")
    .update({
      status,
      date_updated: new Date().toISOString(),
      ...(completed ? { date_completed: completed } : {}),
    })
    .eq("id", id)
    .select("id")
    .single();

  return unwrap(result, "jobs.status");
}

export async function softDeleteJob(id: number) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("transaction_list")
      .update({ del_status: 1, date_updated: new Date().toISOString() })
      .eq("id", id)
      .select("id")
      .single(),
    "jobs.delete",
  );
}

export async function uploadJobImages(files: File[]) {
  const uploaded: Array<{ url: string; path: string }> = [];
  try {
    for (const file of files) {
      uploaded.push(await uploadMediaImage(file, `jobs/${todayIST()}`));
    }
    return uploaded;
  } catch (error) {
    await removeMediaImages(uploaded.map((item) => item.path));
    throw error;
  }
}

export async function attachUploadedJobImages(
  transactionId: number,
  uploaded: Array<{ url: string; path: string }>,
) {
  if (!uploaded.length) return;
  const supabase = await createClient();
  try {
    assertOk(
      await supabase.from("transaction_images").insert(
        uploaded.map((item) => ({
          transaction_id: transactionId,
          image_path: item.url,
        })),
      ),
      "jobs.images.insert",
    );
  } catch (error) {
    await removeMediaImages(uploaded.map((item) => item.path));
    throw error;
  }
}

export async function addJobImages(transactionId: number, files: File[]) {
  if (!files.length) return;
  const uploaded = await uploadJobImages(files);
  await attachUploadedJobImages(transactionId, uploaded);
}

export async function removeJobImage(id: number) {
  const supabase = await createClient();
  const result = await supabase
    .from("transaction_images")
    .select("id, image_path")
    .eq("id", id)
    .maybeSingle();
  assertOk(result, "jobs.image.read");
  const image = result.data;
  if (!image) return;

  assertOk(
    await supabase.from("transaction_images").delete().eq("id", id),
    "jobs.image.delete",
  );

  const marker = "/storage/v1/object/public/media/";
  if (image.image_path.includes(marker)) {
    await removeMediaImages([image.image_path.split(marker)[1] ?? ""]);
  }
}

export async function getMechanicOptions() {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("mechanic_list")
      .select("id, firstname, lastname")
      .eq("delete_flag", 0)
      .eq("status", 1)
      .order("firstname"),
    "jobs.optionMechanics",
  );
}

export async function getJobFormOptions() {
  const supabase = await createClient();
  const [clientsRes, mechanicsRes, servicesRes, productsRes] =
    await Promise.all([
      supabase
        .from("client_list")
        .select("id, firstname, middlename, lastname, contact")
        .eq("delete_flag", 0)
        .order("firstname"),
      supabase
        .from("mechanic_list")
        .select("id, firstname, lastname")
        .eq("delete_flag", 0)
        .eq("status", 1)
        .order("firstname"),
      supabase
        .from("service_list")
        .select("id, name, price")
        .eq("delete_flag", 0)
        .eq("status", 1)
        .order("name"),
      supabase
        .from("product_list")
        .select("id, name, price")
        .eq("delete_flag", 0)
        .eq("status", 1)
        .order("name"),
    ]);

  return {
    clients: unwrap(clientsRes, "jobs.options.clients"),
    mechanics: unwrap(mechanicsRes, "jobs.options.mechanics"),
    services: unwrap(servicesRes, "jobs.options.services"),
    products: unwrap(productsRes, "jobs.options.products"),
  };
}

async function getMechanicNames(ids: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("mechanic_list")
      .select("id, firstname, lastname")
      .in("id", unique),
    "jobs.mechanicNames",
  );
  return new Map(
    rows.map((row) => [row.id, `${row.firstname} ${row.lastname}`.trim()]),
  );
}

async function getTodayJobCodes(dateStr: string): Promise<string[]> {
  const supabase = await createClient();
  const prefix = jobCodePrefix(dateStr);
  const { start, end } = istDayRange(dateStr);
  const rows = unwrap(
    await supabase
      .from("transaction_list")
      .select("code")
      .gte("date_created", start)
      .lte("date_created", end)
      .like("code", `${prefix}%`),
    "jobs.codes",
  );
  return rows.map((row) => row.code);
}

async function claimUniqueJobCode(
  dateStr: string,
  existingCodes: string[],
  jobId: number,
): Promise<string> {
  let candidate = formatJobCode(
    dateStr,
    nextJobCodeSequence(dateStr, existingCodes),
  );
  const supabase = await createClient();

  for (let attempt = 0; attempt < 3; attempt++) {
    const { count } = await supabase
      .from("transaction_list")
      .select("id", { count: "exact", head: true })
      .eq("code", candidate);
    if (!count) return candidate;
    candidate = formatJobCode(
      dateStr,
      nextJobCodeSequence(dateStr, [...existingCodes, candidate]),
    );
  }

  return `${candidate}-${jobId}`;
}

async function removeDuplicateJobCode(
  id: number,
  dateStr: string,
  code: string,
) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("transaction_list")
    .select("id", { count: "exact", head: true })
    .eq("code", code)
    .neq("id", id);

  if (!count) return;

  const next = formatJobCode(
    dateStr,
    nextJobCodeSequence(dateStr, await getTodayJobCodes(dateStr)),
  );
  await supabase.from("transaction_list").update({ code: next }).eq("id", id);
}

function jobTotals(input: Pick<CreateJobInput, "services" | "products">) {
  return {
    total: roundMoney(
      input.services.reduce((sum, line) => sum + lineTotal(1, line.price), 0) +
        input.products.reduce(
          (sum, line) => sum + lineTotal(line.qty, line.price),
          0,
        ),
    ),
  };
}

async function insertJobServices(
  transactionId: number,
  lines: JobServiceLine[],
) {
  const supabase = await createClient();
  assertOk(
    await supabase.from("transaction_services").insert(
      lines.map((line) => ({
        transaction_id: transactionId,
        service_id: line.serviceId,
        service_name: line.name,
        price: line.price,
      })),
    ),
    "jobs.services.insert",
  );
}

async function insertJobProducts(
  transactionId: number,
  lines: JobProductLine[],
) {
  const supabase = await createClient();
  assertOk(
    await supabase.from("transaction_products").insert(
      lines.map((line) => ({
        transaction_id: transactionId,
        product_id:
          line.productId && line.productId > 0 ? line.productId : null,
        product_name: line.name,
        qty: line.qty,
        price: line.price,
      })),
    ),
    "jobs.products.insert",
  );
}
