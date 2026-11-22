import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PaymentForm } from "@/components/clients/payment-form";
import { Button } from "@/components/ui/button";
import { listClientLoans } from "@/lib/data/client-loans";
import { getClientDetail } from "@/lib/data/clients";
import { todayIST } from "@/lib/date";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Add payment" };

export default async function NewClientPaymentPage({
  params,
  searchParams,
}: PageProps<"/clients/[id]/payments/new">) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) notFound();

  const search = await searchParams;
  const [detail, loans] = await Promise.all([
    getClientDetail(clientId),
    listClientLoans(clientId),
  ]);
  if (!detail) notFound();

  const loanParam = Number(search.loan);
  const activeLoans = loans.filter((loan) => loan.status === 1);
  const selectedLoan = activeLoans.find((loan) => loan.id === loanParam);
  const today = todayIST();

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
        today={today}
        cancelHref={`/clients/${clientId}`}
        loanOptions={activeLoans.map((loan) => ({
          id: loan.id,
          label: `Loan #${loan.id} · EMI ${formatINR(loan.emi_amount)}`,
          emi: loan.emi_amount,
        }))}
        initial={
          selectedLoan
            ? {
                amount: selectedLoan.emi_amount,
                discount: 0,
                paymentDate: today,
                paymentMode: "Cash",
                paymentType: "Partial",
                jobId: "",
                billNo: "",
                loanId: selectedLoan.id,
                remarks: `EMI loan #${selectedLoan.id}`,
              }
            : undefined
        }
      />
    </div>
  );
}
