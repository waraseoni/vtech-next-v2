import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PaymentForm } from "@/components/clients/payment-form";
import { Button } from "@/components/ui/button";
import { getClientDetail } from "@/lib/data/clients";
import { getClientLoan } from "@/lib/data/client-loans";
import { listClientPayments } from "@/lib/data/client-payments";
import { todayIST } from "@/lib/date";
import { loanBalance, loanRepaidTotal } from "@/lib/domain/client-loan";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Collect EMI" };

export default async function LoanEmiPage({
  params,
}: PageProps<"/clients/[id]/loans/[loanId]/emi">) {
  const { id, loanId } = await params;
  const clientId = Number(id);
  const loanKey = Number(loanId);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) notFound();
  if (!Number.isSafeInteger(loanKey) || loanKey <= 0) notFound();

  const [detail, loan, payments] = await Promise.all([
    getClientDetail(clientId),
    getClientLoan(clientId, loanKey),
    listClientPayments(clientId, { limit: 1000 }),
  ]);
  if (!detail || !loan) notFound();

  const repaid = loanRepaidTotal(
    loan.id,
    payments
      .filter((row) => row.loan_id === loan.id)
      .map((row) => ({
        loanId: loan.id,
        amount: row.amount,
        discount: row.discount ?? 0,
      })),
  );
  const balance = loanBalance(loan.total_payable, repaid);
  const today = todayIST();
  const suggested = Math.min(
    loan.emi_amount,
    balance > 0 ? balance : loan.emi_amount,
  );
  const closed = loan.status !== 1;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/clients/${clientId}`}>
          <ArrowLeft className="size-4" aria-hidden />
          {detail.client.name}
        </Link>
      </Button>

      <div className="bg-muted/40 grid gap-2 rounded-lg border px-4 py-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs">Loan</p>
          <p className="font-medium">#{loan.id}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Total payable</p>
          <p className="font-medium tabular-nums">
            {formatINR(loan.total_payable)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Balance</p>
          <p className="font-semibold tabular-nums">{formatINR(balance)}</p>
        </div>
      </div>

      {closed ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          Ye loan closed hai. EMI collect karne ke liye pehle loan reopen
          karein.
        </p>
      ) : balance <= 0 ? (
        <p className="border-success/30 bg-success/10 text-success rounded-md border px-3 py-2 text-sm">
          Ye loan poora chuk gaya hai. Ab ise close kar sakte hain.
        </p>
      ) : null}

      <PaymentForm
        clientId={clientId}
        clientName={`${detail.client.name} · Loan #${loan.id}`}
        today={today}
        cancelHref={`/clients/${clientId}`}
        loanOptions={[
          {
            id: loan.id,
            label: `Loan #${loan.id} · EMI ${formatINR(loan.emi_amount)}`,
            emi: loan.emi_amount,
          },
        ]}
        initial={{
          amount: Math.round(suggested * 100) / 100,
          discount: 0,
          paymentDate: today,
          paymentMode: "Cash",
          paymentType: "Partial",
          jobId: "",
          billNo: "",
          loanId: loan.id,
          remarks: `EMI loan #${loan.id}`,
        }}
      />
    </div>
  );
}
