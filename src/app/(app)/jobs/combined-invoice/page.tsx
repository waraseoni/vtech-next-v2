import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { CombinedInvoiceForm } from "@/components/jobs/combined-invoice-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getJobFormOptions } from "@/lib/data/jobs";
import { getPublicSettings } from "@/lib/data/settings";
import { clientDisplayName } from "@/lib/domain/client";

export const metadata = { title: "Combined invoice" };

export default async function CombinedInvoicePage({
  searchParams,
}: PageProps<"/jobs/combined-invoice">) {
  const params = await searchParams;
  const idsParam = typeof params.ids === "string" ? params.ids : "";
  const initialIds = idsParam
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isSafeInteger(value) && value > 0)
    .slice(0, 200);
  const initialBillType = params.bill_type === "gst" ? "gst" : "non_gst";

  const [options, settings] = await Promise.all([
    getJobFormOptions(),
    getPublicSettings(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 print:hidden"
        >
          <Link href="/jobs">
            <ArrowLeft className="size-4" aria-hidden />
            Jobsheet
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight print:hidden">
          Combined invoice
        </h2>
        <p className="text-muted-foreground mt-1 text-sm print:hidden">
          Ek client ke multiple jobs ka ek saath bill/print.
        </p>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Select jobs</CardTitle>
          <CardDescription>
            Client chuniye, jobs select karein, bill type (GST / non-GST)
            chuniye aur print karein.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CombinedInvoiceForm
            clients={options.clients.map((client) => ({
              id: client.id,
              name: clientDisplayName(client),
              contact: client.contact,
            }))}
            company={{
              name: settings.name || settings.short_name || "V-Tech",
              address: settings.address || "",
              contact: settings.contact || "",
              gstin: settings.gstin || settings.gst_no || "",
            }}
            initialIds={initialIds}
            initialBillType={initialBillType}
          />
        </CardContent>
      </Card>
    </div>
  );
}
