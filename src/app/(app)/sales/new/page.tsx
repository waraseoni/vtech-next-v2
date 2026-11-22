import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { SaleForm } from "@/components/sales/sale-form";
import { Button } from "@/components/ui/button";
import { getNextSaleCode, getSaleFormOptions } from "@/lib/data/sales";

export const metadata = { title: "New sale" };

export default async function NewSalePage({
  searchParams,
}: PageProps<"/sales/new">) {
  const params = await searchParams;
  const [options, nextCode] = await Promise.all([
    getSaleFormOptions(),
    getNextSaleCode(),
  ]);

  const preferred = Number(params.client_id);
  const client = options.clients.find((row) => row.id === preferred);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/sales">
            <ArrowLeft className="size-4" aria-hidden />
            Sales
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">New sale</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Save par sale code ~{nextCode} milega. Total RPC server par compute
          karega.
        </p>
      </div>

      <SaleForm
        options={options}
        initial={
          client
            ? {
                clientId: client.id,
                mechanicId: null,
                paymentMode: "Cash",
                remarks: "",
                items: [{ productId: -1, qty: 1, price: 0 }],
              }
            : undefined
        }
      />
    </div>
  );
}
