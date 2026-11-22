import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LoanForm } from "@/components/clients/loan-form";
import { Button } from "@/components/ui/button";
import { getClientDetail } from "@/lib/data/clients";
import { todayIST } from "@/lib/date";

export const metadata = { title: "Give loan" };

export default async function NewClientLoanPage({
  params,
}: PageProps<"/clients/[id]/loans/new">) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) notFound();

  const detail = await getClientDetail(clientId);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/clients/${clientId}`}>
          <ArrowLeft className="size-4" aria-hidden />
          {detail.client.name}
        </Link>
      </Button>
      <LoanForm
        clientId={clientId}
        clientName={detail.client.name}
        today={todayIST()}
        cancelHref={`/clients/${clientId}`}
      />
    </div>
  );
}
