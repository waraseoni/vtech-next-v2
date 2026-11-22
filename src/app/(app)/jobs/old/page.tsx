import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { JobForm } from "@/components/jobs/job-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getJobSpots } from "@/lib/data/job-operations";
import { getJobFormOptions, peekNextJobId } from "@/lib/data/jobs";
import { clientDisplayName } from "@/lib/domain/client";

export const metadata = { title: "Old / backdated job" };

export default async function OldJobPage() {
  const [options, nextJobId, spots] = await Promise.all([
    getJobFormOptions(),
    peekNextJobId(),
    getJobSpots(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/jobs">
            <ArrowLeft className="size-4" aria-hidden />
            Jobsheet
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">
          Old / backdated job
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Purane register se entry daalte waqt apna job id number bhi de sakte
          hain. Automatic counter se surface nahi hoga.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Legacy entry</CardTitle>
          <CardDescription>
            Sab fields normal job jaise hi hain — bas niche job id ka extra
            option hai.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm
            nextJobId={nextJobId}
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
              allowManualJobId: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
