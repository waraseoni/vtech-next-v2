import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BulkEntryForm } from "@/components/jobs/bulk-entry-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getJobFormOptions } from "@/lib/data/jobs";
import { clientDisplayName } from "@/lib/domain/client";

export const metadata = { title: "Bulk entry" };

export default async function BulkJobsPage() {
  const options = await getJobFormOptions();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/jobs">
            <ArrowLeft className="size-4" aria-hidden />
            Jobsheet
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">Bulk entry</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Ek hi client ke multiple jobs ek saath banayein.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jobs list</CardTitle>
          <CardDescription>
            Item aur fault bhar kar rows add karein, phir ek saath save karein.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkEntryForm
            clients={options.clients.map((client) => ({
              id: client.id,
              name: clientDisplayName(client),
              contact: client.contact,
            }))}
            mechanics={options.mechanics.map((mechanic) => ({
              id: mechanic.id,
              name: `${mechanic.firstname} ${mechanic.lastname}`.trim(),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
