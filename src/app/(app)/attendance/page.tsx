import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

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
import {
  canManageAttendance,
  canViewFinancials,
  isSelfServiceAttendance,
} from "@/lib/roles";
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function statusDotClass(status: number): string {
  switch (status) {
    case 1:
      return "bg-success";
    case 2:
      return "bg-destructive";
    case 3:
      return "bg-warning";
    default:
      return "bg-muted-foreground/30";
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function dateNumber(date: string): number {
  return Number(date.slice(8, 10));
}

function dayHref(date: string): string {
  return `/attendance?date=${date}`;
}

function monthHref(month: string): string {
  return `/attendance?view=month&month=${month}`;
}

function monthDayHref(month: string, date: string): string {
  return `/attendance?view=month&month=${month}&date=${date}`;
}

export default async function AttendancePage({
  searchParams,
}: PageProps<"/attendance">) {
  const params = (await searchParams) as AttendanceSearch;
  const session = await requireSession();
  if (!isStaffRole(session.profile.role)) redirect("/dashboard");

  const manageAttendance = canManageAttendance(session.profile.role);
  const selfService = isSelfServiceAttendance(session.profile.role);
  const showFinancials = canViewFinancials(session.profile.role);
  const today = todayIST();

  // Staff day view sirf aaj ka din dikhata hai; month view read-only browse hota hai.
  const view = params.view === "month" ? "month" : "day";
  const date = selfService
    ? today
    : typeof params.date === "string" && isValidDateString(params.date)
      ? params.date
      : today;
  const month =
    typeof params.month === "string" && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : date.slice(0, 7);

  const selfMechanicId = selfService ? session.profile.mechanic_id : null;
  const wantsPunch = view === "day" && selfService && Boolean(selfMechanicId);
  // Admin month view me day cell par click karke us din ki attendance edit ho sakti hai.
  const selectedDate =
    view === "month" &&
    manageAttendance &&
    typeof params.date === "string" &&
    isValidDateString(params.date) &&
    params.date.startsWith(`${month}-`)
      ? params.date
      : null;
  const focusDate = selectedDate ?? date;

  const [dayRows, monthRows, selectedDayRows, geofence] = await Promise.all([
    view !== "day"
      ? Promise.resolve([])
      : selfService
        ? selfMechanicId
          ? getAttendanceDay(date, selfMechanicId)
          : Promise.resolve([])
        : getAttendanceDay(date),
    view === "month"
      ? selfService
        ? selfMechanicId
          ? getAttendanceMonth(month, selfMechanicId)
          : Promise.resolve([])
        : getAttendanceMonth(month)
      : Promise.resolve([]),
    selectedDate ? getAttendanceDay(selectedDate) : Promise.resolve([]),
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
    ? dayRows.find((row) => row.mechanicId === selfMechanicId)
    : undefined;
  const punchName =
    punchRow?.name ||
    session.profile.full_name ||
    session.email ||
    "My attendance";

  const totalDays = daysInMonth(month);
  const firstWeekday = new Date(`${month}-01T00:00:00Z`).getUTCDay();
  const calendarCells: Array<string | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from(
      { length: totalDays },
      (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`,
    ),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

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
        <div className="flex flex-wrap items-center gap-2">
          {selfService ? (
            <Badge variant="outline">
              {view === "month"
                ? "Sirf apni attendance · view only"
                : "Aaj · sirf apni attendance"}
            </Badge>
          ) : null}
          <div className="flex gap-2">
            <Button
              asChild
              size="sm"
              variant={view === "day" ? "default" : "outline"}
            >
              <Link href={dayHref(focusDate)}>Daily</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant={view === "month" ? "default" : "outline"}
            >
              <Link
                href={
                  view === "month"
                    ? monthHref(month)
                    : monthHref(date.slice(0, 7))
                }
              >
                Monthly
              </Link>
            </Button>
          </div>
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

      {selfService && !selfMechanicId ? (
        <p
          role="alert"
          className="border-warning/30 bg-warning/10 rounded-md border px-3 py-2 text-sm"
        >
          Aapka account kisi mechanic se linked nahi hai. Admin se profile link
          karwayein — phir check-in/out chalega.
        </p>
      ) : null}

      {view === "day" ? (
        <>
          {manageAttendance ? (
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
                      key={date}
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
          ) : (
            <Card className="gap-0 py-0">
              <CardContent className="text-muted-foreground flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
                <CalendarDays className="size-4" aria-hidden />
                <span>
                  Sirf aaj ka din dikhta hai. Check-in/out aap kar sakte hain,
                  time edit sirf admin kar sakta hai.
                </span>
              </CardContent>
            </Card>
          )}

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

          {manageAttendance ? (
            <AttendanceDayForm key={date} date={date} rows={dayRows} />
          ) : dayRows.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              {selfService
                ? "Aaj ki attendance abhi mark nahi hui — check-in karein."
                : "Is din ki koi attendance nahi hai."}
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

          {manageAttendance &&
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
                    key={month}
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
              ...(showFinancials
                ? [
                    {
                      label: "Salary earned",
                      value: formatINR(monthSummary.salaryEarned, {
                        maximumFractionDigits: 0,
                      }),
                    },
                  ]
                : []),
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
            <div
              className="overflow-x-auto"
              role="region"
              aria-label="Monthly attendance calendar"
              tabIndex={0}
            >
              <div className="min-w-[720px]">
                <div className="bg-muted/40 text-muted-foreground grid grid-cols-7 border-b text-xs">
                  {WEEKDAYS.map((weekday) => (
                    <div
                      key={weekday}
                      className="px-2 py-2 text-center font-medium"
                    >
                      {weekday}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {calendarCells.map((cellDate, index) => {
                    if (!cellDate) {
                      return (
                        <div
                          key={`blank-${index}`}
                          aria-hidden
                          className="bg-muted/10 min-h-24 border-r border-b"
                        />
                      );
                    }

                    const cellClass = cn(
                      "min-h-24 border-r border-b p-1.5",
                      manageAttendance && "hover:bg-muted/40 transition-colors",
                      (index % 7 === 0 || index % 7 === 6) && "bg-muted/15",
                      cellDate === today &&
                        "bg-primary/5 ring-primary/40 ring-1 ring-inset",
                      cellDate === selectedDate &&
                        "bg-primary/10 ring-primary/60 ring-1 ring-inset",
                      cellDate > today && "opacity-60",
                    );

                    const content = (
                      <>
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={cn(
                              "grid size-6 place-items-center rounded-full text-xs font-medium tabular-nums",
                              cellDate === today &&
                                "bg-primary text-primary-foreground",
                            )}
                          >
                            {dateNumber(cellDate)}
                          </span>
                          {cellDate === today ? (
                            <span className="text-primary text-[10px] font-medium">
                              Today
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1.5 space-y-0.5">
                          {cellDate > today
                            ? null
                            : monthRows.map((row) => {
                                const day = row.days[cellDate];
                                const status = day?.status ?? 0;
                                return (
                                  <div
                                    key={row.mechanicId}
                                    className="flex items-center gap-1.5"
                                    title={`${row.name}: ${statusLabel(status)}${day ? ` · ${fmtMins(day.workedMin)}` : ""}`}
                                  >
                                    <span
                                      className={cn(
                                        "size-2 shrink-0 rounded-full",
                                        statusDotClass(status),
                                      )}
                                      aria-hidden
                                    />
                                    <span className="text-muted-foreground truncate text-[11px]">
                                      {initials(row.name)}
                                    </span>
                                    <span className="sr-only">
                                      {row.name}: {statusLabel(status)}
                                    </span>
                                  </div>
                                );
                              })}
                        </div>
                      </>
                    );

                    return manageAttendance ? (
                      <Link
                        key={cellDate}
                        href={monthDayHref(month, cellDate)}
                        aria-current={
                          cellDate === selectedDate ? "date" : undefined
                        }
                        className={cellClass}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div key={cellDate} className={cellClass}>
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {manageAttendance ? (
            selectedDate ? (
              <section
                className="space-y-3"
                aria-labelledby="month-edit-heading"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 id="month-edit-heading" className="text-sm font-semibold">
                    Edit attendance ·{" "}
                    {formatIST(`${selectedDate}T12:00:00+05:30`, {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })}
                  </h3>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={monthHref(month)}>Close</Link>
                  </Button>
                </div>
                <AttendanceDayForm
                  key={selectedDate}
                  date={selectedDate}
                  rows={selectedDayRows}
                />
              </section>
            ) : (
              <p className="text-muted-foreground text-xs">
                Kisi bhi din par click karke us din ki attendance edit karein.
              </p>
            )
          ) : (
            <p className="text-muted-foreground text-xs">
              Month view sirf dekhne ke liye hai. Attendance edit ke liye admin
              se sampark karein.
            </p>
          )}

          <Card className="gap-0 overflow-hidden py-0">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
              <p className="text-sm font-medium">
                {selfService ? "Aapki monthly summary" : "Mechanic summary"}
              </p>
              <p className="text-muted-foreground text-xs">
                {monthRows.length} mechanics
              </p>
            </div>
            {monthRows.length === 0 ? (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                Koi active mechanic nahi mila.
              </p>
            ) : (
              <ul className="divide-y">
                {monthRows.map((row) => (
                  <li
                    key={row.mechanicId}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5"
                  >
                    <p className="text-sm font-medium">{row.name}</p>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
                      <span>
                        {row.present}P · {row.halfDay}H · {row.absent}A
                      </span>
                      <span>{fmtMins(row.workedMin)}</span>
                      {showFinancials ? (
                        <span>
                          {formatINR(row.salaryEarned, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {showFinancials ? (
            <p className="text-muted-foreground text-xs">
              Salary = daily salary × (present + half day ÷ 2). Summary me P =
              present, H = half day, A = absent.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
