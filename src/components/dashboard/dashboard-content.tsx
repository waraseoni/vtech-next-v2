import { AttendanceStrip } from "@/components/dashboard/attendance-strip";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RecentJobs } from "@/components/dashboard/recent-jobs";
import { RecentPayments } from "@/components/dashboard/recent-payments";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatusMix } from "@/components/dashboard/status-mix";
import { getDashboardData } from "@/lib/data/dashboard";

export async function DashboardContent({
  includeFinancials,
}: {
  includeFinancials: boolean;
}) {
  const data = await getDashboardData(includeFinancials);

  return (
    <div className="space-y-4">
      <KpiCards stats={data.stats} showFinancials={includeFinancials} />

      {includeFinancials ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <RevenueChart points={data.monthlyRevenue} />
          </div>
          <StatusMix stats={data.stats} />
        </div>
      ) : (
        <StatusMix stats={data.stats} />
      )}

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RecentJobs jobs={data.recentJobs} showAmounts={includeFinancials} />
        </div>
        <div className="min-w-0 space-y-4">
          <AttendanceStrip rows={data.attendance} />
          {includeFinancials ? (
            <RecentPayments payments={data.recentPayments} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
