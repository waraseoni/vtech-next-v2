import { format } from "date-fns";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { nowIST } from "@/lib/date";
import { canViewFinancials } from "@/lib/roles";

export const metadata = { title: "Dashboard" };

function greetingIST(): string {
  const hour = nowIST().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await requireSession();
  const now = nowIST();
  const today = format(now, "EEEE, d MMM yyyy");
  const firstName = session.profile.full_name?.split(/\s+/)[0] ?? "there";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">
            {today} · {greetingIST()}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Welcome back, {firstName}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="gap-1.5">
            <span className="bg-success size-1.5 rounded-full" aria-hidden />
            Live data
          </Badge>
          <Button asChild size="sm">
            <Link href="/jobs">
              <Plus className="size-4" aria-hidden />
              New job
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent
          includeFinancials={canViewFinancials(session.profile.role)}
        />
      </Suspense>
    </div>
  );
}
