import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { AttendanceDayForm } from "@/components/attendance/attendance-day-form";
import { SelfPunchCard } from "@/components/attendance/self-punch-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isStaffRole, requireSession } from "@/lib/auth";
import {
  getAttendanceDay,
  getAttendanceMonth,
  getGeofence,
} from "@/lib/data/attendance";
import {
  ATTENDANCE_STATUS_LABELS,
  type AttendanceStatus,
} from "@/lib/constants/status";
import { fmtMins } from "@/lib/domain/attendance-hours";
import { formatIST, isValidDateString, todayIST } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Attendance" };

type AttendanceSearch = {
  view?: string;
  date?: string;
  month?: string;
};

function shiftDate(date: string, delta: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + delta);
  return value.toISOString().slice(0, 10);
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const value = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  return formatIST(`${month}-01T12:00:00+05:30`, {
    month: "long",
    year: "numeric",
  });
}

function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

function statusLabel(status: number): string {
  return ATTENDANCE_STATUS_LABELS[status as AttendanceStatus] ?? "Unmarked";
}

function statusClass(status: number): string {
  switch (status) {
    case 1:
      return "bg-success/15 text-success";
    case 2:
      return "bg-destructive/15 text-destructive";
    case 3:
      return "bg-warning/15 text-warning";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function dayHref(date: string): string {
  return `/attendance?date=${date}`;
}

function monthHref(month: string): string {
  return `/attendance?view=month&month=${month}`;
}

export default async function AttendancePage({
  searchParams,
}: PageProps<"/attendance">) {
  const params = (await searchParams) as AttendanceSearch;
  const session = await requireSession();
  const staff = isStaffRole(session.profile.role);

  const view = params.view === "month" ? "month" : "day";
  const today = todayIST();
  const date =
    typeof params.date === "string" && isValidDateString(params.date)
      ? params.date
      : today;
  const month =
    typeof params.month === "string" && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : date.slice(0, 7);

  const wantsPunch =
    view === "day" &&
    date === today &&
    staff &&
    Boolean(session.profile.mechanic_id);

  const [dayRows, monthRows, geofence] = await Promise.all([
    view === "day" ? getAttendanceDay(date) : Promise.resolve([]),
    view === "month" ? getAttendanceMonth(month) : Promise.resolve([]),
    wantsPunch ? getGeofence() : Promise.resolve(null),
  ]);

  const daySummary = dayRows.reduce(
    (acc, row) => {
      if (row.status === 1) acc.present += 1;
      else if (row.status === 2) acc.absent += 1;
      else if (row.status === 3) acc.halfDay += 1;
      else acc.unmarked += 1;
      acc.workedMin += row.workedMin;
      acc.otMin += row.otMin;
      return acc;
    },
    { present: 0, halfDay: 0, absent: 0, unmarked: 0, workedMin: 0, otMin: 0 },
  );

  const monthSummary = monthRows.reduce(
    (acc, row) => {
      acc.present += row.present;
      acc.halfDay += row.halfDay;
      acc.absent += row.absent;
      acc.workedMin += row.workedMin;
      acc.otMin += row.otMin;
      acc.salaryEarned += row.salaryEarned;
      return acc;
    },
    {
      present: 0,
      halfDay: 0,
      absent: 0,
      workedMin: 0,
      otMin: 0,
      salaryEarned: 0,
    },
  );

  const punchRow = wantsPunch
    ? dayRows.find((row) => row.mechanicId === session.profile.mechanic_id)
    : undefined;
  const punchName =
    punchRow?.name ||
    session.profile.full_name ||
    session.email ||
    "My attendance";

  const totalDays = daysInMonth(month);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Team</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Attendance
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {view === "day"
              ? formatIST(`${date}T12:00:00+05:30`, {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : `${monthLabel(month)} · ${totalDays} din`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            asChild
            size="sm"
            variant={view === "day" ? "default" : "outline"}
          >
            <Link href={dayHref(date)}>Daily</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant={view === "month" ? "default" : "outline"}
          >
            <Link href={monthHref(month)}>Monthly</Link>
          </Button>
        </div>
      </div>

      {wantsPunch && geofence ? (
        <SelfPunchCard
          mechanicName={punchName}
          timeIn={punchRow?.timeIn ?? null}
          timeOut={punchRow?.timeOut ?? null}
          geofenceEnabled={geofence.enabled}
        />
      ) : null}

      {view === "day" ? (
        <>
          <Card className="gap-0 py-0">
            <CardContent className="flex flex-wrap items-end gap-3 px-4 py-3">
              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  aria-label="Previous day"
                >
                  <Link href={dayHref(shiftDate(date, -1))}>
                    <ChevronLeft className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  aria-label="Next day"
                >
                  <Link href={dayHref(shiftDate(date, 1))}>
                    <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </div>
              <form
                action="/attendance"
                method="get"
                className="flex items-end gap-2"
              >
                <div className="grid gap-1.5">
                  <label
                    htmlFor="attendance-date"
                    className="text-muted-foreground text-xs"
                  >
                    Date
                  </label>
                  <Input
                    id="attendance-date"
                    type="date"
                    name="date"
                    defaultValue={date}
                  />
                </div>
                <Button type="submit" variant="secondary">
                  Go
                </Button>
              </form>
              {date !== today ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={dayHref(today)}>Today</Link>
                </Button>
              ) : null}
              <span className="text-muted-foreground ml-auto hidden items-center gap-1 text-xs sm:flex">
                <CalendarDays className="size-3.5" aria-hidden />
                Auto-close: duty end + 15 min
              </span>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Present", value: String(daySummary.present) },
              { label: "Half day", value: String(daySummary.halfDay) },
              { label: "Absent", value: String(daySummary.absent) },
              { label: "Worked", value: fmtMins(daySummary.workedMin) },
              { label: "OT", value: fmtMins(daySummary.otMin) },
            ].map((tile) => (
              <Card key={tile.label} className="gap-1 py-3">
                <CardContent className="px-4">
                  <p className="text-muted-foreground text-xs">{tile.label}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {tile.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {staff ? (
            <AttendanceDayForm date={date} rows={dayRows} />
          ) : dayRows.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              Is din ki koi attendance nahi hai.
            </p>
          ) : (
            <Card className="gap-0 overflow-hidden py-0">
              <ul className="divide-y">
                {dayRows.map((row) => (
                  <li
                    key={row.mechanicId}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {row.timeIn?.slice(0, 5) ?? "—"} →{" "}
                        {row.effectiveOut ?? row.timeOut?.slice(0, 5) ?? "—"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent",
                        statusClass(row.status),
                      )}
                    >
                      {statusLabel(row.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {staff &&
          daySummary.unmarked === dayRows.length &&
          dayRows.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              Aaj tak kisi ki attendance mark nahi hui — status chunein aur save
              karein.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <Card className="gap-0 py-0">
            <CardContent className="flex flex-wrap items-end gap-3 px-4 py-3">
              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  aria-label="Previous month"
                >
                  <Link href={monthHref(shiftMonth(month, -1))}>
                    <ChevronLeft className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  aria-label="Next month"
                >
                  <Link href={monthHref(shiftMonth(month, 1))}>
                    <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </div>
              <form
                action="/attendance"
                method="get"
                className="flex items-end gap-2"
              >
                <input type="hidden" name="view" value="month" />
                <div className="grid gap-1.5">
                  <label
                    htmlFor="attendance-month"
                    className="text-muted-foreground text-xs"
                  >
                    Month
                  </label>
                  <Input
                    id="attendance-month"
                    type="month"
                    name="month"
                    defaultValue={month}
                  />
                </div>
                <Button type="submit" variant="secondary">
                  Go
                </Button>
              </form>
              {month !== today.slice(0, 7) ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={monthHref(today.slice(0, 7))}>This month</Link>
                </Button>
              ) : null}
              <div className="ml-auto flex flex-wrap gap-2">
                {(
                  [
                    [1, "Present"],
                    [3, "Half day"],
                    [2, "Absent"],
                    [0, "Unmarked"],
                  ] as const
                ).map(([status, label]) => (
                  <Badge
                    key={status}
                    variant="outline"
                    className={cn("border-transparent", statusClass(status))}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Present", value: String(monthSummary.present) },
              { label: "Half day", value: String(monthSummary.halfDay) },
              { label: "Absent", value: String(monthSummary.absent) },
              { label: "Worked", value: fmtMins(monthSummary.workedMin) },
              { label: "OT", value: fmtMins(monthSummary.otMin) },
              {
                label: "Salary earned",
                value: formatINR(monthSummary.salaryEarned, {
                  maximumFractionDigits: 0,
                }),
              },
            ].map((tile) => (
              <Card key={tile.label} className="gap-1 py-3">
                <CardContent className="px-4">
                  <p className="text-muted-foreground text-xs">{tile.label}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {tile.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="gap-0 overflow-hidden py-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground border-b text-xs">
                    <th className="bg-muted/40 sticky left-0 z-10 px-4 py-2.5 text-left font-medium">
                      Mechanic
                    </th>
                    {Array.from({ length: totalDays }, (_, index) => (
                      <th
                        key={index}
                        className="min-w-8 px-1 py-2.5 text-center font-medium tabular-nums"
                      >
                        {index + 1}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right font-medium">Days</th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Hours
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Salary
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map((row) => (
                    <tr key={row.mechanicId} className="border-b last:border-0">
                      <td className="bg-background sticky left-0 z-10 px-4 py-2 font-medium whitespace-nowrap">
                        {row.name}
                      </td>
                      {Array.from({ length: totalDays }, (_, index) => {
                        const dayKey = `${month}-${String(index + 1).padStart(2, "0")}`;
                        const day = row.days[dayKey];
                        const status = day?.status ?? 0;
                        return (
                          <td
                            key={dayKey}
                            className="px-0.5 py-1 text-center"
                            title={
                              day
                                ? `${statusLabel(status)} · ${fmtMins(day.workedMin)}`
                                : "Unmarked"
                            }
                          >
                            <span
                              className={cn(
                                "inline-grid size-7 place-items-center rounded-md text-xs tabular-nums",
                                statusClass(status),
                              )}
                            >
                              {index + 1}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                        {row.present}P · {row.halfDay}H · {row.absent}A
                      </td>
                      <td className="px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                        {fmtMins(row.workedMin)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                        {formatINR(row.salaryEarned, {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {monthRows.length === 0 ? (
              <p className="text-muted-foreground px-4 py-10 text-center text-sm">
                Koi active mechanic nahi mila.
              </p>
            ) : null}
          </Card>
          <p className="text-muted-foreground text-xs">
            Salary = daily salary × (present + half day ÷ 2). Days column me P =
            present, H = half day, A = absent.
          </p>
        </>
      )}
    </div>
  );
}
