"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isStaffRole, requireSession } from "@/lib/auth";
import { recordActivity } from "@/lib/data/audit";
import { clientInputFromForm } from "@/lib/data/client-input";
import {
  createClientRecord,
  removeClientPhoto,
  softDeleteClient,
  updateClientRecord,
  uploadClientPhoto,
} from "@/lib/data/clients";
import { DataError } from "@/lib/data/errors";
import { canDeleteRecords } from "@/lib/roles";

export type ClientFormState = { error: string | null };
export type DeleteClientState = { error: string | null };

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

export async function saveClientAction(
  _previous: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { error: "Is account ke paas client edit ka access nahi hai." };
  }

  const parsed = clientInputFromForm(formData);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Client details sahi nahi hain.",
    };
  }

  const id = parseId(formData.get("id"));
  const photo = formData.get("photo");
  let uploaded: { url: string; path: string } | null = null;

  if (photo instanceof File && photo.size > 0) {
    try {
      uploaded = await uploadClientPhoto(photo);
    } catch (error) {
      return { error: friendlyError(error, "Photo upload nahi hua.") };
    }
  }

  const data = parsed.data;
  const payload = {
    firstname: data.firstname,
    middlename: data.middlename || null,
    lastname: data.lastname,
    contact: data.contact,
    email: data.email || null,
    address: data.address,
    opening_balance: data.openingBalance,
    payment_due_date: data.paymentDueDate || null,
    payment_due_remarks: data.paymentDueRemarks || null,
  };

  let targetId = id;
  try {
    if (id > 0) {
      await updateClientRecord(id, {
        ...payload,
        ...(uploaded ? { image_path: uploaded.url } : {}),
      });
    } else {
      const created = await createClientRecord({
        ...payload,
        image_path: uploaded?.url ?? null,
        delete_flag: 0,
      });
      targetId = created.id;
    }
  } catch {
    if (uploaded) await removeClientPhoto(uploaded.path);
    return { error: "Client save nahi hua. Dobara try karein." };
  }

  const clientName = [data.firstname, data.middlename, data.lastname]
    .filter(Boolean)
    .join(" ");
  await recordActivity(session, {
    module: "Clients",
    action: id > 0 ? "update" : "create",
    metaId: targetId,
    details: `${clientName} (${data.contact})`,
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${targetId}`);
  redirect(`/clients/${targetId}`);
}

export async function deleteClientAction(
  _previous: DeleteClientState,
  formData: FormData,
): Promise<DeleteClientState> {
  const session = await requireSession();
  if (!canDeleteRecords(session.profile.role)) {
    return { error: "Delete sirf admin/developer kar sakta hai." };
  }

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Client id sahi nahi hai." };

  try {
    await softDeleteClient(id);
  } catch {
    return { error: "Client delete nahi hua. Dobara try karein." };
  }

  await recordActivity(session, {
    module: "Clients",
    action: "delete",
    metaId: id,
    details: "Soft delete (delete_flag=1)",
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect("/clients");
}
