"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isStaffRole, requireSession } from "@/lib/auth";
import { recordActivity } from "@/lib/data/audit";
import { DataError } from "@/lib/data/errors";
import { saleInputFromForm } from "@/lib/data/sale-input";
import { createSale, updateSale } from "@/lib/data/sales";

export type SaleFormState = { error: string | null };

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

export async function saveSaleAction(
  _previous: SaleFormState,
  formData: FormData,
): Promise<SaleFormState> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { error: "Is account ke paas sale edit ka access nahi hai." };
  }

  const parsed = saleInputFromForm(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Sale details sahi nahi hain.",
    };
  }

  const data = parsed.data;
  const payload = {
    clientId: data.clientId,
    mechanicId: data.mechanicId ?? null,
    paymentMode: data.paymentMode,
    remarks: data.remarks ?? null,
    lastEditedBy: session.profile.mechanic_id ?? 0,
    lastEditedByName:
      session.profile.full_name ?? session.email ?? "Admin panel",
    items: data.items,
  };

  const saleId = parseId(formData.get("id"));
  try {
    const result =
      saleId > 0
        ? await updateSale({ ...payload, saleId })
        : await createSale(payload);

    await recordActivity(session, {
      module: "Sales",
      action: saleId > 0 ? "update" : "create",
      metaId: result.id,
      details:
        "saleCode" in result
          ? `${result.saleCode} · ${data.items.length} item(s)`
          : `${data.items.length} item(s)`,
    });

    revalidatePath("/sales");
    revalidatePath(`/sales/${result.id}`);
    revalidatePath("/clients");
    redirect(`/sales/${result.id}`);
  } catch (error) {
    if (error instanceof DataError) {
      return { error: friendlyError(error, "Sale save nahi hui.") };
    }
    throw error;
  }
}
