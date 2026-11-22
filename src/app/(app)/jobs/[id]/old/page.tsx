import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobForm } from "@/components/jobs/job-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getJobSpots } from "@/lib/data/job-operations";
import { getJobDetail, getJobFormOptions } from "@/lib/data/jobs";
import { clientDisplayName } from "@/lib/domain/client";

export const metadata = { title: "Edit old job" };

export default async function OldJobEditPage({
  params,
}: PageProps<"/jobs/[id]/old">) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isSafeInteger(jobId) || jobId <= 0) notFound();

  const [detail, options, spots] = await Promise.all([
    getJobDetail(jobId),
    getJobFormOptions(),
    getJobSpots(),
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
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Edit old job
          </h2>
          <Badge variant="outline">Legacy entry</Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {detail.job.code} · purane job ka header edit karein.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Legacy job details</CardTitle>
          <CardDescription>
            Sab fields normal edit jaise hain. Service Center structured fields
            bhi yahi se bhare ja sakte hain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm
            initial={{
              id: jobId,
              clientId: detail.job.clientId ?? 0,
              mechanicId: detail.job.mechanic_id ?? null,
              brandId: detail.job.brand_id ?? options.defaultBrandId,
              serviceTypeId:
                detail.job.service_type_id ?? options.defaultServiceTypeId,
              itemCategory: detail.job.item_category ?? "",
              model: detail.job.model ?? "",
              serialNo: detail.job.serial_no ?? "",
              warrantyStatus: detail.job.warranty_status ?? "",
              warrantyClaimNo: detail.job.warranty_claim_no ?? "",
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
              brands: options.brands,
              serviceTypes: options.serviceTypes,
              mode: options.mode,
              defaultServiceTypeId: options.defaultServiceTypeId,
              defaultBrandId: options.defaultBrandId,
              spots,
              initialLocationId: detail.job.location_id,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
