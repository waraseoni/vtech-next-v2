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
  createJob,
  removeJobImage,
  softDeleteJob,
  updateJob,
  updateJobStatus,
  uploadJobImages,
} from "@/lib/data/jobs";
import { createClient } from "@/lib/supabase/server";
import { canTransitionJobStatus, isJobStatus } from "@/lib/constants/status";
import { canDeleteRecords } from "@/lib/roles";

export type JobFormState = { error: string | null };
export type JobActionState = { error: string | null; ok?: boolean };

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
