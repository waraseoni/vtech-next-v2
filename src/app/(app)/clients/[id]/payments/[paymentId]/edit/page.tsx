import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeletePaymentButton } from "@/components/clients/delete-payment-button";
import { PaymentForm } from "@/components/clients/payment-form";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { getClientLoan, listClientLoans } from "@/lib/data/client-loans";
import { getClientPayment } from "@/lib/data/client-payments";
import { getClientDetail } from "@/lib/data/clients";
import { formatINR } from "@/lib/money";
import { canDeleteRecords } from "@/lib/roles";

export const metadata = { title: "Edit payment" };

export default async function EditClientPaymentPage({
  params,
}: PageProps<"/clients/[id]/payments/[paymentId]/edit">) {
  const { id, paymentId } = await params;
  const clientId = Number(id);
  const paymentKey = Number(paymentId);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) notFound();
  if (!Number.isSafeInteger(paymentKey) || paymentKey <= 0) notFound();

  const [session, detail, payment, loans] = await Promise.all([
    requireSession(),
    getClientDetail(clientId),
    getClientPayment(clientId, paymentKey),
    listClientLoans(clientId),
  ]);
  if (!detail || !payment) notFound();

  const loan = payment.loan_id
    ? await getClientLoan(clientId, payment.loan_id)
    : null;
  const canDelete = canDeleteRecords(session.profile.role);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/clients/${clientId}`}>
          <ArrowLeft className="size-4" aria-hidden />
          {detail.client.name}
        </Link>
      </Button>

      <PaymentForm
        clientId={clientId}
        clientName={detail.client.name}
        today={payment.payment_date?.slice(0, 10) ?? ""}
        cancelHref={`/clients/${clientId}`}
        loanOptions={loans
          .filter((row) => row.status === 1 || row.id === payment.loan_id)
          .map((row) => ({
            id: row.id,
            label: `Loan #${row.id} · EMI ${formatINR(row.emi_amount)}${
              row.status === 1 ? "" : " (closed)"
            }`,
            emi: row.emi_amount,
          }))}
        initial={{
          id: payment.id,
          amount: payment.amount,
          discount: payment.discount ?? 0,
          paymentDate: payment.payment_date?.slice(0, 10) ?? "",
          paymentMode: payment.payment_mode ?? "Cash",
          paymentType: payment.payment_type ?? "Full",
          jobId: payment.job_id ?? "",
          billNo: payment.bill_no ?? "",
          loanId: payment.loan_id ?? 0,
          remarks: payment.remarks ?? "",
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Net amount DB me amount − discount se auto-calculate hota hai
          {loan ? ` · Loan #${loan.id}` : ""}.
        </p>
        {canDelete ? (
          <DeletePaymentButton
            clientId={clientId}
            paymentId={payment.id}
            amountLabel={formatINR(payment.amount)}
          />
        ) : null}
      </div>
    </div>
  );
}
