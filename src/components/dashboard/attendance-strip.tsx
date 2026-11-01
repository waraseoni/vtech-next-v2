import { ArrowUpRight } from "lucide-react";
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
import {
  ATTENDANCE_STATUS_LABELS,
  type AttendanceStatus,
} from "@/lib/constants/status";
import type { AttendanceStripRow } from "@/lib/data/dashboard";
import { fmtTimeIST } from "@/lib/date";

const STATUS_VARIANT: Record<
  AttendanceStatus,
  "success" | "warning" | "destructive" | "secondary"
> = {
  0: "secondary",
  1: "success",
  2: "destructive",
  3: "warning",
};

function isAttendanceStatus(value: number): value is AttendanceStatus {
  return value in ATTENDANCE_STATUS_LABELS;
}

export function AttendanceStrip({ rows }: { rows: AttendanceStripRow[] }) {
  const inCount = rows.filter(
    (row) => row.status === 1 || row.status === 3,
  ).length;

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="flex-row items-start justify-between gap-2 px-5">
        <div>
          <CardDescription>Today</CardDescription>
          <CardTitle className="mt-1 text-lg">Attendance</CardTitle>
          <p className="text-muted-foreground mt-1 text-xs">
            {inCount}/{rows.length} mechanics in
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/attendance">
            Open
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-5">
        {rows.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            Koi active mechanic nahi hai.
          </p>
        ) : (
          <ul className="-mr-1 max-h-64 space-y-1 overflow-y-auto pr-1">
            {rows.map((row) => {
              const status: AttendanceStatus = isAttendanceStatus(row.status)
                ? row.status
                : 0;
              return (
                <li
                  key={row.mechanicId}
                  className="hover:bg-muted/60 flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {row.timeIn
                        ? row.timeOut
                          ? `${fmtTimeIST(row.timeIn)} – ${fmtTimeIST(row.timeOut)}`
                          : `In ${fmtTimeIST(row.timeIn)}`
                        : "No check-in"}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[status]}>
                    {ATTENDANCE_STATUS_LABELS[status]}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
