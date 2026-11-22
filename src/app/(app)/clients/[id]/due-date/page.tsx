import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DueDateForm } from "@/components/clients/due-date-form";
import { Button } from "@/components/ui/button";
import { getClientDetail } from "@/lib/data/clients";

export const metadata = { title: "Payment due date" };

export default async function ClientDueDatePage({
  params,
}: PageProps<"/clients/[id]/due-date">) {
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
      <DueDateForm
        clientId={clientId}
        clientName={detail.client.name}
        dueDate={detail.client.payment_due_date?.slice(0, 10) ?? ""}
        dueRemarks={detail.client.payment_due_remarks ?? ""}
        cancelHref={`/clients/${clientId}`}
      />
    </div>
  );
}
