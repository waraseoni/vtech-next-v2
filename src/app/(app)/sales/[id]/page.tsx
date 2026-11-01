import {
  ArrowLeft,
  CalendarClock,
  Pencil,
  ReceiptIndianRupee,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSaleDetail } from "@/lib/data/sales";
import { formatIST } from "@/lib/date";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Sale" };

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return formatIST(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SaleDetailPage({
  params,
}: PageProps<"/sales/[id]">) {
  const { id } = await params;
  const saleId = Number(id);
  if (!Number.isSafeInteger(saleId) || saleId <= 0) notFound();

  const detail = await getSaleDetail(saleId);
  if (!detail) notFound();

  const { sale, items } = detail;
  const itemsTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-1 -ml-2">
            <Link href="/sales">
              <ArrowLeft className="size-4" aria-hidden />
              Sales
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {sale.sale_code}
            </h2>
            <Badge variant="outline">{sale.payment_mode}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {fmtDateTime(sale.date_created)}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/sales/${sale.id}/edit`}>
            <Pencil className="size-4" aria-hidden />
            Edit
          </Link>
        </Button>
      </div>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs">Client</p>
            {sale.client_id ? (
              <Link
                href={`/clients/${sale.client_id}`}
                className="mt-1 block font-medium hover:underline"
              >
                {sale.clientName}
              </Link>
            ) : (
              <p className="mt-1 font-medium">Walk-in</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Mechanic</p>
            <p className="mt-1 flex items-center gap-1.5 font-medium">
              <User className="text-muted-foreground size-3.5" aria-hidden />
              {sale.mechanicName ?? "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground text-xs">Remarks</p>
            <p className="mt-1 text-sm whitespace-pre-line">
              {sale.remarks || "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="flex items-center gap-2">
            <ReceiptIndianRupee className="size-4" aria-hidden />
            Items
          </CardTitle>
          <CardDescription>
            Stock ledger se abhi linked nahi (inventory module ke saath aayega).
          </CardDescription>
        </CardHeader>
        <div className="divide-y">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.productName}</p>
                <p className="text-muted-foreground text-xs">
                  {item.qty} × {formatINR(item.price)}
                </p>
              </div>
              <span className="tabular-nums">{formatINR(item.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="bg-muted/40 flex items-center justify-between border-t px-5 py-3 text-sm font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatINR(sale.total_amount)}</span>
        </div>
        {Math.abs(itemsTotal - sale.total_amount) > 0.01 ? (
          <p className="text-muted-foreground px-5 py-2 text-xs">
            Items sum {formatINR(itemsTotal)} hai; stored total RPC se aata hai.
          </p>
        ) : null}
      </Card>

      <Card className="gap-3 py-5">
        <CardHeader className="px-5">
          <CardTitle>Audit</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-1 px-5 text-sm">
          <p className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5" aria-hidden />
            Last edited by {sale.last_edited_by_name ?? "—"}
          </p>
          <p>Last edited {fmtDateTime(sale.last_edited_date)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
