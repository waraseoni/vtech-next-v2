import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MonthlyRevenuePoint } from "@/lib/data/dashboard";
import { formatINR, formatINRCompact, sumMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function RevenueChart({ points }: { points: MonthlyRevenuePoint[] }) {
  const total = sumMoney(points.map((point) => point.revenue));
  const max = Math.max(1, ...points.map((point) => point.revenue));
  const currentMonth = points.at(-1)?.month;

  return (
    <Card className="h-full gap-4 py-5">
      <CardHeader className="flex-row items-start justify-between gap-3 px-5">
        <div>
          <CardDescription>Last 12 months</CardDescription>
          <CardTitle className="mt-1 text-lg">Revenue</CardTitle>
          <p className="text-muted-foreground mt-1 text-xs">
            Total{" "}
            <span className="text-foreground font-medium">
              {formatINR(total, { maximumFractionDigits: 0 })}
            </span>
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/sales">
            Sales
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-5">
        {points.length === 0 ? (
          <div className="text-muted-foreground grid h-48 place-items-center rounded-lg border border-dashed text-sm">
            Abhi koi revenue record nahi hai.
          </div>
        ) : (
          <div className="pb-1">
            <div className="flex h-48 items-end gap-1.5">
              {points.map((point, index) => {
                const height = Math.max(
                  2,
                  Math.round((point.revenue / max) * 100),
                );
                const isCurrent = point.month === currentMonth;
                return (
                  <div
                    key={point.month}
                    className={cn(
                      "group h-full flex-1 flex-col items-center justify-end gap-1.5",
                      index < points.length - 6 ? "hidden sm:flex" : "flex",
                    )}
                  >
                    <span className="text-muted-foreground text-[10px] font-medium tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
                      {formatINRCompact(point.revenue)}
                    </span>
                    <div
                      className="flex w-full flex-1 items-end"
                      title={`${point.month}: ${formatINR(point.revenue)}`}
                    >
                      <div
                        style={{ height: `${height}%` }}
                        className={cn(
                          "w-full rounded-t-md transition-colors",
                          isCurrent
                            ? "bg-primary"
                            : "bg-primary/25 group-hover:bg-primary/45",
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] whitespace-nowrap",
                        isCurrent
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {point.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
