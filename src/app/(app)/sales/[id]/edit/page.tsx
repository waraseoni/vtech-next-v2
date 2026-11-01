import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SaleForm } from "@/components/sales/sale-form";
import { Button } from "@/components/ui/button";
import { getSaleDetail, getSaleFormOptions } from "@/lib/data/sales";

export const metadata = { title: "Edit sale" };

export default async function EditSalePage({
  params,
}: PageProps<"/sales/[id]/edit">) {
  const { id } = await params;
  const saleId = Number(id);
  if (!Number.isSafeInteger(saleId) || saleId <= 0) notFound();

  const [detail, options] = await Promise.all([
    getSaleDetail(saleId),
    getSaleFormOptions(),
  ]);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href={`/sales/${saleId}`}>
            <ArrowLeft className="size-4" aria-hidden />
            {detail.sale.sale_code}
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">Edit sale</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Items save par replace honge; total RPC recompute karega.
        </p>
      </div>

      <SaleForm
        initial={{
          id: saleId,
          clientId: detail.sale.client_id ?? 0,
          mechanicId: detail.sale.mechanic_id ?? null,
          paymentMode: detail.sale.payment_mode,
          remarks: detail.sale.remarks ?? "",
          items: detail.items.map((item) => ({
            productId: item.product_id ?? 0,
            qty: item.qty,
            price: item.price,
          })),
        }}
        options={options}
      />
    </div>
  );
}
