import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobForm } from "@/components/jobs/job-form";
import { Button } from "@/components/ui/button";
import { getJobDetail, getJobFormOptions } from "@/lib/data/jobs";
import { clientDisplayName } from "@/lib/domain/client";

export const metadata = { title: "Edit job" };

export default async function EditJobPage({
  params,
}: PageProps<"/jobs/[id]/edit">) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isSafeInteger(jobId) || jobId <= 0) notFound();

  const [detail, options] = await Promise.all([
    getJobDetail(jobId),
    getJobFormOptions(),
  ]);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href={`/jobs/${jobId}`}>
            <ArrowLeft className="size-4" aria-hidden />
            Job #{detail.job.job_id ?? jobId}
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">Edit job</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {detail.job.code} · items save par replace honge.
        </p>
      </div>

      <JobForm
        initial={{
          id: jobId,
          clientId: detail.job.clientId ?? 0,
          mechanicId: detail.job.mechanic_id ?? null,
          item: detail.job.item,
          fault: detail.job.fault,
          remark: detail.job.remark,
          spot: detail.job.uniq_id,
          commissionAmount:
            detail.job.mechanic_commission_amount ??
            detail.job.mechanic_amount ??
            0,
          services: detail.services.map((line) => ({
            serviceId: line.service_id,
            price: line.price,
          })),
          products: detail.products.map((line) => ({
            productId: line.product_id ?? 0,
            name: line.product_name ?? "",
            qty: line.qty,
            price: line.price,
          })),
        }}
        options={{
          clients: options.clients.map((client) => ({
            id: client.id,
            name: clientDisplayName(client),
            contact: client.contact,
          })),
          mechanics: options.mechanics.map((mechanic) => ({
            id: mechanic.id,
            name: `${mechanic.firstname} ${mechanic.lastname}`.trim(),
          })),
          services: options.services,
          products: options.products,
        }}
      />
    </div>
  );
}
