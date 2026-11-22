"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isStaffRole, requireSession } from "@/lib/auth";
import { recordActivity } from "@/lib/data/audit";
import {
  findClientDuplicates,
  syncClientContacts,
  type DuplicateClient,
} from "@/lib/data/client-contacts";
import { clientInputFromForm } from "@/lib/data/client-input";
import {
  createClientLoan,
  deleteClientLoan,
  getClientLoan,
  setClientLoanStatus,
} from "@/lib/data/client-loans";
import {
  createClientPayment,
  deleteClientPayment,
  getClientPayment,
  updateClientPayment,
} from "@/lib/data/client-payments";
import {
  createClientRecord,
  softDeleteClient,
  updateClientRecord,
} from "@/lib/data/clients";
import {
  contactsFromForm,
  dueDateSchema,
  loanInputFromForm,
} from "@/lib/data/loan-input";
import { paymentInputFromForm } from "@/lib/data/payment-input";
import { computeLoanTerms } from "@/lib/domain/client-loan";
import { canDeleteRecords } from "@/lib/roles";

export type ClientFormState = { error: string | null };
export type DeleteClientState = { error: string | null };
export type PaymentFormState = { error: string | null };
export type LoanFormState = { error: string | null };
export type DueDateFormState = { error: string | null };
export type DuplicateCheckState = {
  error: string | null;
  checked: boolean;
  duplicates: DuplicateClient[];
};

function parseId(value: FormDataEntryValue | null): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 0;
  return Number(value);
}

function revalidateClient(clientId: number) {
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/ledger`);
  revalidatePath("/clients/payments");
  revalidatePath("/clients/loans");
}

function contactsError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Contact details sahi nahi hain.";
  }
  return "Contacts data sahi nahi hai.";
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

  // Only sync contacts when the form actually carries the editor payload, so
  // forms that predate the contact editor never wipe `client_contacts`.
  const hasContacts = formData.has("contacts");
  let contacts = [] as ReturnType<typeof contactsFromForm>;
  if (hasContacts) {
    try {
      contacts = contactsFromForm(formData);
    } catch (error) {
      return { error: contactsError(error) };
    }
  }

  const id = parseId(formData.get("id"));

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
      await updateClientRecord(id, payload);
    } else {
      const created = await createClientRecord({
        ...payload,
        delete_flag: 0,
      });
      targetId = created.id;
    }
  } catch {
    return { error: "Client save nahi hua. Dobara try karein." };
  }

  if (hasContacts) {
    try {
      await syncClientContacts(targetId, contacts);
    } catch {
      return {
        error:
          "Client save hua par contacts update nahi hue. Client edit karke dobara try karein.",
      };
    }
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

  revalidateClient(targetId);
  redirect(`/clients/${targetId}`);
}

export async function checkClientDuplicates(input: {
  contact: string;
  email: string;
  excludeId?: number;
}): Promise<DuplicateCheckState> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { error: "Access nahi hai.", checked: false, duplicates: [] };
  }

  const contact = input.contact.trim();
  const email = input.email.trim();
  if (!contact && !email) {
    return { error: null, checked: true, duplicates: [] };
  }

  try {
    const duplicates = await findClientDuplicates({
      contact,
      email,
      excludeId: input.excludeId,
    });
    return { error: null, checked: true, duplicates };
  } catch {
    return {
      error: "Duplicate check nahi chala. Manually verify karein.",
      checked: false,
      duplicates: [],
    };
  }
}

export async function saveClientPaymentAction(
  _previous: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { error: "Payment entry ka access nahi hai." };
  }

  const parsed = paymentInputFromForm(formData);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Payment details sahi nahi hain.",
    };
  }
  const data = parsed.data;

  if (data.loanId > 0) {
    const loan = await getClientLoan(data.clientId, data.loanId);
    if (!loan) return { error: "Ye loan is client ka nahi hai." };
    if (loan.status !== 1) {
      return {
        error: "Ye loan closed hai, isme naya EMI record nahi ban sakta.",
      };
    }
  }

  const input = {
    clientId: data.clientId,
    amount: data.amount,
    discount: data.discount,
    paymentDate: data.paymentDate,
    paymentMode: data.paymentMode,
    paymentType: data.paymentType,
    jobId: data.jobId,
    billNo: data.billNo,
    loanId: data.loanId > 0 ? data.loanId : null,
    remarks: data.remarks,
  };

  try {
    if (data.paymentId > 0) {
      const existing = await getClientPayment(data.clientId, data.paymentId);
      if (!existing) return { error: "Payment record nahi mila." };
      await updateClientPayment(data.paymentId, input);
    } else {
      await createClientPayment(input);
    }
  } catch {
    return { error: "Payment save nahi hua. Dobara try karein." };
  }

  await recordActivity(session, {
    module: "Clients",
    action: data.paymentId > 0 ? "update" : "create",
    metaId: data.clientId,
    details: `Payment ₹${data.amount} (${data.paymentDate}, ${data.paymentMode})${
      data.loanId > 0 ? ` loan #${data.loanId}` : ""
    }`,
  });

  revalidateClient(data.clientId);
  redirect(`/clients/${data.clientId}`);
}

export async function deleteClientPaymentAction(
  _previous: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const session = await requireSession();
  if (!canDeleteRecords(session.profile.role)) {
    return { error: "Payment delete sirf admin/developer kar sakta hai." };
  }

  const clientId = parseId(formData.get("client_id"));
  const paymentId = parseId(formData.get("payment_id"));
  if (!clientId || !paymentId) return { error: "Payment id sahi nahi hai." };

  try {
    const existing = await getClientPayment(clientId, paymentId);
    if (!existing) return { error: "Payment record nahi mila." };
    await deleteClientPayment(paymentId);
  } catch {
    return { error: "Payment delete nahi hua. Dobara try karein." };
  }

  await recordActivity(session, {
    module: "Clients",
    action: "delete",
    metaId: clientId,
    details: `Payment #${paymentId} delete`,
  });

  revalidateClient(clientId);
  redirect(`/clients/${clientId}`);
}

export async function saveClientLoanAction(
  _previous: LoanFormState,
  formData: FormData,
): Promise<LoanFormState> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { error: "Loan entry ka access nahi hai." };
  }

  const parsed = loanInputFromForm(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Loan details sahi nahi hain.",
    };
  }
  const data = parsed.data;
  const terms = computeLoanTerms({
    principal: data.principal,
    annualRate: data.interestRate,
    months: data.months,
  });

  try {
    await createClientLoan({
      clientId: data.clientId,
      principal: data.principal,
      interestRate: data.interestRate,
      months: data.months,
      totalPayable: terms.totalPayable,
      emi: terms.emi,
      loanDate: data.loanDate,
      remarks: data.remarks,
    });
  } catch {
    return { error: "Loan save nahi hua. Dobara try karein." };
  }

  await recordActivity(session, {
    module: "Clients",
    action: "create",
    metaId: data.clientId,
    details: `Loan ₹${data.principal} @ ${data.interestRate}% × ${data.months} mo (EMI ₹${terms.emi})`,
  });

  revalidateClient(data.clientId);
  redirect(`/clients/${data.clientId}`);
}

export async function setClientLoanStatusAction(
  _previous: LoanFormState,
  formData: FormData,
): Promise<LoanFormState> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { error: "Loan update ka access nahi hai." };
  }

  const clientId = parseId(formData.get("client_id"));
  const loanId = parseId(formData.get("loan_id"));
  const status = formData.get("status") === "0" ? 0 : 1;
  if (!clientId || !loanId) return { error: "Loan id sahi nahi hai." };

  try {
    const loan = await getClientLoan(clientId, loanId);
    if (!loan) return { error: "Loan record nahi mila." };
    await setClientLoanStatus(loanId, status);
  } catch {
    return { error: "Loan update nahi hua. Dobara try karein." };
  }

  await recordActivity(session, {
    module: "Clients",
    action: "status",
    metaId: clientId,
    details: `Loan #${loanId} ${status === 1 ? "active" : "closed"}`,
  });

  revalidateClient(clientId);
  return { error: null };
}

export async function deleteClientLoanAction(
  _previous: LoanFormState,
  formData: FormData,
): Promise<LoanFormState> {
  const session = await requireSession();
  if (!canDeleteRecords(session.profile.role)) {
    return { error: "Loan delete sirf admin/developer kar sakta hai." };
  }

  const clientId = parseId(formData.get("client_id"));
  const loanId = parseId(formData.get("loan_id"));
  if (!clientId || !loanId) return { error: "Loan id sahi nahi hai." };

  try {
    const loan = await getClientLoan(clientId, loanId);
    if (!loan) return { error: "Loan record nahi mila." };
    await deleteClientLoan(loanId);
  } catch {
    return { error: "Loan delete nahi hua. Dobara try karein." };
  }

  await recordActivity(session, {
    module: "Clients",
    action: "delete",
    metaId: clientId,
    details: `Loan #${loanId} delete`,
  });

  revalidateClient(clientId);
  redirect(`/clients/${clientId}`);
}

export async function saveDueDateAction(
  _previous: DueDateFormState,
  formData: FormData,
): Promise<DueDateFormState> {
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) {
    return { error: "Due date edit ka access nahi hai." };
  }

  const parsed = dueDateSchema.safeParse({
    clientId: formData.get("client_id"),
    dueDate: formData.get("due_date") ?? "",
    remarks: formData.get("due_remarks") ?? "",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Due date sahi nahi hai.",
    };
  }

  const data = parsed.data;
  try {
    await updateClientRecord(data.clientId, {
      payment_due_date: data.dueDate || null,
      payment_due_remarks: data.remarks || null,
    });
  } catch {
    return { error: "Due date save nahi hua. Dobara try karein." };
  }

  await recordActivity(session, {
    module: "Clients",
    action: "update",
    metaId: data.clientId,
    details: `Due date ${data.dueDate || "cleared"}`,
  });

  revalidateClient(data.clientId);
  redirect(`/clients/${data.clientId}`);
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
