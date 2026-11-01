import { TZDate } from "@date-fns/tz";
import { format, subDays } from "date-fns";

export const IST = "Asia/Kolkata";
/** India has no DST, so a fixed offset is safe for wall-clock stamps. */
export const IST_OFFSET = "+05:30";

export function nowIST(): TZDate {
  return new TZDate(Date.now(), IST);
}

/** "YYYY-MM-DD" in IST. */
export function todayIST(): string {
  return format(nowIST(), "yyyy-MM-dd");
}

/** "YYYY-MM" in IST. */
export function currentMonthIST(): string {
  return format(nowIST(), "yyyy-MM");
}

export function daysAgoIST(days: number): string {
  return format(subDays(nowIST(), days), "yyyy-MM-dd");
}

export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function istDateAt(
  dateStr: string,
  hours: number,
  minutes: number,
  seconds: number,
  ms: number,
): TZDate {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new TZDate(year, month - 1, day, hours, minutes, seconds, ms, IST);
}

/** Start/end instants (ISO UTC) for an IST calendar day. */
export function istDayRange(dateStr: string): { start: string; end: string } {
  return {
    start: istDateAt(dateStr, 0, 0, 0, 0).toISOString(),
    end: istDateAt(dateStr, 23, 59, 59, 999).toISOString(),
  };
}

/** First/last IST calendar day of a "YYYY-MM" month, as "YYYY-MM-DD". */
export function istMonthDays(monthStr: string): {
  first: string;
  last: string;
} {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    first: `${monthStr}-01`,
    last: `${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** Start instant of the first day / end instant of the last day of a month. */
export function istMonthRange(monthStr: string): {
  start: string;
  end: string;
} {
  const { first, last } = istMonthDays(monthStr);
  return {
    start: istDayRange(first).start,
    end: istDayRange(last).end,
  };
}

/** "YYYY-MM-DD" of an instant, in IST. */
export function toISTDatePart(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatIST(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    ...options,
  }).format(date);
}

/** Current IST clock as "HH:mm:ss". */
export function nowISTTime(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("hour")}:${get("minute")}:${get("second")}`;
}

/** ISO stamp for a datetime-local value, interpreted as IST wall-clock. */
export function dtLocalToIST(value: string): string {
  if (!value) return "";
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(value)) return value;
  return value.length === 16
    ? `${value}:00${IST_OFFSET}`
    : `${value}${IST_OFFSET}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/** Minutes between two "HH:mm(:ss)" values; supports overnight shifts. */
export function minsBetweenIST(
  timeIn: string | null,
  timeOut: string | null,
): number | null {
  if (!timeIn || !timeOut) return null;
  let diff = timeToMinutes(timeOut) - timeToMinutes(timeIn);
  if (diff < 0) diff += 1440;
  return diff;
}

export function hoursBetweenIST(
  timeIn: string | null,
  timeOut: string | null,
): string {
  const mins = minsBetweenIST(timeIn, timeOut);
  if (mins === null) return "—";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** Mirrors the PHP rule: both times < 6h → half day, else present. */
export function deriveStatusFromTimes(
  timeIn: string | null,
  timeOut: string | null,
): 1 | 3 | null {
  if (!timeIn) return null;
  if (!timeOut) return 1;
  const mins = minsBetweenIST(timeIn, timeOut);
  return mins !== null && mins < 360 ? 3 : 1;
}

/** "14:05:00" → "2:05 PM". */
export function fmtTimeIST(value: string | null | undefined): string {
  if (!value) return "--:--";
  const [hours, minutes] = value.split(":").map(Number);
  const meridiem = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}
