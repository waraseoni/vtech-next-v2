import { ArrowUpRight, Banknote } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RecentPayment } from "@/lib/data/dashboard";
import { formatIST } from "@/lib/date";
import { formatINR } from "@/lib/money";

export function RecentPayments({ payments }: { payments: RecentPayment[] }) {
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="flex-row items-start justify-between gap-2 px-5">
        <div>
          <CardDescription>Latest entries</CardDescription>
          <CardTitle className="mt-1 text-lg">Payments</CardTitle>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/clients">
            Clients
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-5">
        {payments.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            Abhi koi payment record nahi hai.
          </p>
        ) : (
          <ul className="divide-y">
            {payments.map((payment) => {
              const net = payment.amount - payment.discount;
              return (
                <li
                  key={payment.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="bg-success/10 text-success grid size-8 shrink-0 place-items-center rounded-lg">
                      <Banknote className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {payment.clientName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {payment.paymentDate
                          ? formatIST(payment.paymentDate, {
                              day: "2-digit",
                              month: "short",
                            })
                          : "No date"}
                        {payment.discount > 0
                          ? ` · −${formatINR(payment.discount, {
                              maximumFractionDigits: 0,
                            })} disc`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatINR(net, { maximumFractionDigits: 0 })}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {payment.paymentMode ?? "Cash"}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
