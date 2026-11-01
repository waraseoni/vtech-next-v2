import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { JobForm } from "@/components/jobs/job-form";
import { Button } from "@/components/ui/button";
import { clientDisplayName } from "@/lib/domain/client";
import { getJobFormOptions, peekNextJobId } from "@/lib/data/jobs";

export const metadata = { title: "New job" };

export default async function NewJobPage() {
  const [options, nextJobId] = await Promise.all([
    getJobFormOptions(),
    peekNextJobId(),
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
        <h2 className="text-2xl font-semibold tracking-tight">New job</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Job id save par atomic counter se milega.
        </p>
      </div>

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
        }}
      />
    </div>
  );
}
