import {
  BadgeCheck,
  IndianRupee,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/data/dashboard";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

const numberFmt = new Intl.NumberFormat("en-IN");

type Tile = {
  label: string;
  value: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  tone: string;
};

export function KpiCards({
  stats,
  showFinancials,
}: {
  stats: DashboardStats;
  showFinancials: boolean;
}) {
  const tiles: Tile[] = [];

  if (showFinancials) {
    tiles.push({
      label: "Aaj ki kamai",
      value: formatINR(stats.todayRepair + stats.todayDirect, {
        maximumFractionDigits: 0,
      }),
      hint: `Repair ${formatINR(stats.todayRepair, { maximumFractionDigits: 0 })} · Direct ${formatINR(stats.todayDirect, { maximumFractionDigits: 0 })}`,
      href: "/sales",
      icon: IndianRupee,
      tone: "bg-success/10 text-success",
    });
  }

  tiles.push(
    {
      label: "In progress",
      value: numberFmt.format(stats.inProgressJobs),
      hint: `${numberFmt.format(stats.pendingJobs)} pending · ${numberFmt.format(stats.finishedJobs)} finished`,
      href: "/jobs",
      icon: Wrench,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Completed",
      value: numberFmt.format(stats.paidJobs + stats.deliveredJobs),
      hint: `${numberFmt.format(stats.paidJobs)} paid · ${numberFmt.format(stats.deliveredJobs)} delivered`,
      href: "/jobs",
      icon: BadgeCheck,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Clients",
      value: numberFmt.format(stats.totalClients),
      hint: `${numberFmt.format(stats.totalMechanics)} active mechanics`,
      href: "/clients",
      icon: Users,
      tone: "bg-warning/10 text-warning",
    },
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <Link
          key={tile.label}
          href={tile.href}
          className="group focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-[3px]"
        >
          <Card className="group-hover:border-primary/40 h-full gap-3 py-5 transition-colors">
            <CardContent className="flex items-start justify-between gap-3 px-5">
              <div className="min-w-0">
                <CardDescription>{tile.label}</CardDescription>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                  {tile.value}
                </p>
                <p className="text-muted-foreground mt-1 truncate text-xs">
                  {tile.hint}
                </p>
              </div>
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg",
                  tile.tone,
                )}
              >
                <tile.icon className="size-4" aria-hidden />
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
