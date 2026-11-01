import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/constants/status";
import type { DashboardStats } from "@/lib/data/dashboard";
import { cn } from "@/lib/utils";

const SEGMENTS: {
  status: JobStatus;
  field: keyof DashboardStats;
  color: string;
}[] = [
  { status: 0, field: "pendingJobs", color: "bg-warning" },
  { status: 1, field: "inProgressJobs", color: "bg-primary" },
  { status: 2, field: "finishedJobs", color: "bg-primary/40" },
  { status: 3, field: "paidJobs", color: "bg-success" },
  { status: 5, field: "deliveredJobs", color: "bg-success/50" },
  { status: 4, field: "cancelledJobs", color: "bg-destructive" },
];

export function StatusMix({ stats }: { stats: DashboardStats }) {
  const segments = SEGMENTS.map((segment) => ({
    ...segment,
    label: JOB_STATUS_LABELS[segment.status],
    count: stats[segment.field],
  }));
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <Card className="h-full gap-4 py-5">
      <CardHeader className="px-5">
        <CardDescription>All time</CardDescription>
        <CardTitle className="mt-1 text-lg">Job status</CardTitle>
        <p className="text-muted-foreground mt-1 text-xs">
          {new Intl.NumberFormat("en-IN").format(stats.totalJobs)} total jobs
        </p>
      </CardHeader>
      <CardContent className="px-5">
        <div className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full">
          {total === 0
            ? null
            : segments
                .filter((segment) => segment.count > 0)
                .map((segment) => (
                  <div
                    key={segment.status}
                    className={cn("h-full", segment.color)}
                    style={{ width: `${(segment.count / total) * 100}%` }}
                    title={`${segment.label}: ${segment.count}`}
                  />
                ))}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {segments.map((segment) => (
            <div
              key={segment.status}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <dt className="flex min-w-0 items-center gap-2">
                <span
                  className={cn("size-2 shrink-0 rounded-full", segment.color)}
                  aria-hidden
                />
                <span
                  className={cn(
                    "truncate",
                    segment.count === 0 && "text-muted-foreground",
                  )}
                >
                  {segment.label}
                </span>
              </dt>
              <dd
                className={cn(
                  "font-medium tabular-nums",
                  segment.count === 0 && "text-muted-foreground",
                )}
              >
                {segment.count}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
