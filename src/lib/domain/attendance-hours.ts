import { nowISTTime, todayIST } from "@/lib/date";
import { dutyMinutes, normTime, toMins, type Duty } from "@/lib/domain/duty";

/** Checkout is auto-closed this long after duty end. */
export const AUTO_CLOSE_GRACE_MIN = 15;

export type AttRow = {
  curr_date: string;
  status: number;
  time_in: string | null;
  time_out: string | null;
};

export type NowInfo = { date: string; mins: number };

export type DayHours = {
  hasTimeIn: boolean;
  effOut: string | null;
  isAutoClosed: boolean;
  working: boolean;
  workedMin: number;
  dutyMin: number;
  otMin: number;
  lateInMin: number;
  earlyOutMin: number;
};

export function nowISTInfo(): NowInfo {
  const mins = toMins(nowISTTime());
  return { date: todayIST(), mins: Number.isNaN(mins) ? 0 : mins };
}

function isOvernight(duty: Duty): boolean {
  return normTime(duty.end) < normTime(duty.start);
}

function offsetFor(time: string, duty: Duty): number {
  const mins = toMins(time);
  if (Number.isNaN(mins)) return NaN;
  return isOvernight(duty) && mins < toMins(duty.start) ? mins + 1440 : mins;
}

function dayDiff(from: string, to: string): number {
  const num = (value: string) =>
    Date.UTC(
      Number(value.slice(0, 4)),
      Number(value.slice(5, 7)) - 1,
      Number(value.slice(8, 10)),
    );
  const a = num(from);
  const b = num(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

function fmtOffset(offset: number): string {
  const mins = ((offset % 1440) + 1440) % 1440;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(
    mins % 60,
  ).padStart(2, "0")}`;
}

export function fmtMins(mins: number): string {
  if (!Number.isFinite(mins) || mins <= 0) return "—";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/**
 * Rules: real checkout wins; no check-in → nothing derived; past duty end +
 * grace → auto-close at duty end (0 OT); otherwise live working.
 */
export function computeDay(row: AttRow, duty: Duty, now: NowInfo): DayHours {
  const dutyMin = dutyMinutes(duty);
  const dutyStart = toMins(duty.start);
  const overnight = isOvernight(duty);
  const dutyEndOffset =
    (Number.isNaN(toMins(duty.end)) ? 0 : toMins(duty.end)) +
    (overnight ? 1440 : 0);

  const base: DayHours = {
    hasTimeIn: false,
    effOut: null,
    isAutoClosed: false,
    working: false,
    workedMin: 0,
    dutyMin,
    otMin: 0,
    lateInMin: 0,
    earlyOutMin: 0,
  };

  const inStr = normTime(row.time_in);
  if (!inStr) return base;

  const nowOffset = dayDiff(row.curr_date, now.date) * 1440 + now.mins;
  const inOff = offsetFor(inStr, duty);
  const realOut = normTime(row.time_out);

  let effOff: number | null;
  let auto = false;
  let working = false;

  if (realOut) {
    effOff = offsetFor(realOut, duty);
    if (effOff < inOff) effOff += 1440;
  } else if (nowOffset >= dutyEndOffset + AUTO_CLOSE_GRACE_MIN) {
    effOff = dutyEndOffset;
    auto = true;
  } else {
    effOff = null;
    working = true;
  }

  const workedRaw = effOff === null ? nowOffset - inOff : effOff - inOff;
  const workedMin = Math.max(0, Math.min(workedRaw, 1440));
  const earlyOutMin =
    !auto && effOff !== null ? Math.max(0, dutyEndOffset - effOff) : 0;
  const otMin = !auto && effOff !== null ? Math.max(0, workedMin - dutyMin) : 0;

  return {
    hasTimeIn: true,
    effOut: effOff === null ? null : fmtOffset(effOff),
    isAutoClosed: auto,
    working,
    workedMin,
    dutyMin,
    otMin,
    lateInMin: Math.max(0, inOff - dutyStart),
    earlyOutMin,
  };
}

/** Derived audit columns for attendance writes (NULLs when no check-in). */
export function derivedCols(row: AttRow, duty: Duty, now = nowISTInfo()) {
  const day = computeDay(row, duty, now);
  if (!day.hasTimeIn) {
    return {
      worked_min: null,
      ot_min: 0,
      duty_min: null,
      is_auto_closed: false,
    };
  }
  return {
    worked_min: day.workedMin,
    ot_min: day.otMin,
    duty_min: day.dutyMin,
    is_auto_closed: day.isAutoClosed,
  };
}

export const CLEAR_DERIVED_COLS = {
  worked_min: null,
  ot_min: 0,
  duty_min: null,
  is_auto_closed: false,
} as const;
