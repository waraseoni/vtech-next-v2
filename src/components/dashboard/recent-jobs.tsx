import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RecentJob } from "@/lib/data/dashboard";
import { formatIST } from "@/lib/date";
import { formatINR } from "@/lib/money";

export function RecentJobs({
  jobs,
  showAmounts,
}: {
  jobs: RecentJob[];
  showAmounts: boolean;
}) {
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="flex-row items-start justify-between gap-2 px-5">
        <div>
          <CardDescription>Latest updates</CardDescription>
          <CardTitle className="mt-1 text-lg">Recent jobs</CardTitle>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/jobs">
            View all
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        {jobs.length === 0 ? (
          <p className="text-muted-foreground mx-5 rounded-lg border border-dashed p-4 text-sm">
            Abhi koi job record nahi hai.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="text-muted-foreground border-y text-left text-xs">
                  <th className="px-4 py-2 font-medium sm:px-5">Job</th>
                  <th className="hidden w-40 px-3 py-2 font-medium sm:table-cell">
                    Client
                  </th>
                  <th className="w-24 px-2 py-2 font-medium sm:px-3">Status</th>
                  {showAmounts ? (
                    <th className="w-20 px-4 py-2 text-right font-medium sm:w-24 sm:px-5">
                      Amount
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-muted/50 border-b last:border-0"
                  >
                    <td className="min-w-0 px-4 py-2.5 sm:px-5">
                      <p className="font-mono text-xs font-medium">
                        #{job.jobId ?? job.code}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {job.item}
                        {job.fault ? ` · ${job.fault}` : ""}
                      </p>
                    </td>
                    <td className="hidden max-w-40 px-3 py-2.5 sm:table-cell">
                      <p className="truncate">{job.clientName}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatIST(job.dateCreated, {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </td>
                    <td className="px-2 py-2.5 sm:px-3">
                      <JobStatusBadge status={job.status} />
                      <p className="text-muted-foreground mt-0.5 text-xs sm:hidden">
                        {formatIST(job.dateCreated, {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </td>
                    {showAmounts ? (
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums sm:px-5">
                        {formatINR(job.amount, { maximumFractionDigits: 0 })}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
