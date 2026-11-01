export type Duty = {
  start: string;
  end: string;
  breakMinutes: number;
};

export type DutyScheduleRow = {
  id?: number;
  mechanic_id: number;
  duty_start: string;
  duty_end: string;
  break_minutes?: number | null;
  effective_from: string;
  note?: string | null;
  created_at?: string;
};

export const DEFAULT_DUTY: Duty = {
  start: "10:00",
  end: "20:00",
  breakMinutes: 0,
};

/** "10:00:00" / "10:00" → "HH:MM"; invalid → "". */
export function normTime(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value).trim());
  if (!match) return "";
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "10:00" → 600; invalid → NaN. */
export function toMins(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(normTime(value));
  if (!match) return NaN;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function dutyMinutes(duty: Duty): number {
  const start = toMins(duty.start);
  const end = toMins(duty.end);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  let span = end - start;
  if (span < 0) span += 1440;
  if (span === 0) return 0;
  return Math.max(0, span - Math.max(0, duty.breakMinutes || 0));
}

export function isValidDuty(duty: Duty): boolean {
  if (!normTime(duty.start) || !normTime(duty.end)) return false;
  return dutyMinutes(duty) > 0;
}

export function rowToDuty(
  row: DutyScheduleRow | null | undefined,
): Duty | null {
  if (!row) return null;
  const duty: Duty = {
    start: normTime(row.duty_start),
    end: normTime(row.duty_end),
    breakMinutes: Math.max(0, Number(row.break_minutes ?? 0)) || 0,
  };
  return isValidDuty(duty) ? duty : null;
}

export function sortDutyDesc(
  rows: DutyScheduleRow[] | null | undefined,
): DutyScheduleRow[] {
  if (!rows?.length) return [];
  return [...rows].sort((a, b) =>
    String(b.effective_from).localeCompare(String(a.effective_from)),
  );
}

export function currentSchedule(
  rows: DutyScheduleRow[] | null | undefined,
  date: string,
): DutyScheduleRow | null {
  for (const row of sortDutyDesc(rows)) {
    const effectiveFrom = String(row.effective_from || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) continue;
    if (effectiveFrom <= date) return row;
  }
  return null;
}

export function dutyFor(
  rows: DutyScheduleRow[] | null | undefined,
  date: string,
  fallback: Duty = DEFAULT_DUTY,
): Duty {
  return rowToDuty(currentSchedule(rows, date)) || fallback;
}

/**
 * Shop-level fallback from `system_info` biz_open/biz_close.
 * Missing or invalid values fall back to DEFAULT_DUTY.
 */
export function bizDutyFromMeta(
  rows:
    Array<{ meta_field: string; meta_value: string | null }> | null | undefined,
): Duty {
  const info: Record<string, string> = {};
  for (const row of rows || []) {
    if (row.meta_value != null) info[row.meta_field] = String(row.meta_value);
  }
  const start = normTime(info.biz_open);
  const end = normTime(info.biz_close);
  if (start && end && start !== end) return { start, end, breakMinutes: 0 };
  return DEFAULT_DUTY;
}

export function fmtDuty(duty: Duty | null | undefined): string {
  if (!duty) return "—";
  const start = normTime(duty.start);
  const end = normTime(duty.end);
  if (!start || !end) return "—";
  return `${start} – ${end}`;
}
