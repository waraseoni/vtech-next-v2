import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BulkEditForm } from "@/components/jobs/bulk-edit-form";
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

export const metadata = { title: "Bulk edit" };

export default async function BulkEditJobsPage() {
  const options = await getJobFormOptions();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/jobs">
            <ArrowLeft className="size-4" aria-hidden />
            Jobsheet
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">Bulk edit</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Client ke saare jobs ka header (item, fault, remark, mechanic) ek
          saath badlein.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select &amp; edit</CardTitle>
          <CardDescription>
            Line items (services/parts) is tool se nahi badte — unke liye
            individual edit use karein.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkEditForm
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
