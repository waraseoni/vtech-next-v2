import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientForm } from "@/components/clients/client-form";
import { Button } from "@/components/ui/button";
import { getClientDetail } from "@/lib/data/clients";

export const metadata = { title: "Edit client" };

export default async function EditClientPage({
  params,
}: PageProps<"/clients/[id]/edit">) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) notFound();

  const detail = await getClientDetail(clientId);
  if (!detail) notFound();

  const { client } = detail;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/clients/${clientId}`}>
          <ArrowLeft className="size-4" aria-hidden />
          {client.name}
        </Link>
      </Button>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Edit client</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Details update karein.
        </p>
      </div>
      <ClientForm
        initial={{
          id: client.id,
          firstname: client.firstname,
          middlename: client.middlename ?? "",
          lastname: client.lastname,
          contact: client.contact,
          email: client.email ?? "",
          address: client.address,
          openingBalance: client.opening_balance ?? 0,
          paymentDueDate: client.payment_due_date ?? "",
          paymentDueRemarks: client.payment_due_remarks ?? "",
        }}
      />
    </div>
  );
}
