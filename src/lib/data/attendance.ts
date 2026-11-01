import "server-only";

import { assertOk, unwrap } from "@/lib/data/errors";
import { istMonthDays, nowISTTime, todayIST } from "@/lib/date";
import {
  CLEAR_DERIVED_COLS,
  computeDay,
  derivedCols,
  nowISTInfo,
  type AttRow,
} from "@/lib/domain/attendance-hours";
import {
  DEFAULT_DUTY,
  bizDutyFromMeta,
  dutyFor,
  normTime,
  type Duty,
  type DutyScheduleRow,
} from "@/lib/domain/duty";
import { parseGeofence, type Geofence } from "@/lib/domain/geo";
import { roundMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export type AttendanceDayRow = {
  mechanicId: number;
  name: string;
  status: number;
  timeIn: string | null;
  timeOut: string | null;
  effectiveOut: string | null;
  workedMin: number;
  otMin: number;
  isAutoClosed: boolean;
  working: boolean;
  lateInMin: number;
  duty: Duty;
  latIn: number | null;
  lngIn: number | null;
  latOut: number | null;
  lngOut: number | null;
};

export type AttendanceMonthMechanic = {
  mechanicId: number;
  name: string;
  dailySalary: number;
  days: Record<string, { status: number; workedMin: number; otMin: number }>;
  present: number;
  halfDay: number;
  absent: number;
  workedMin: number;
  otMin: number;
  salaryEarned: number;
};

export type AttendanceUpsertInput = {
  mechanicId: number;
  date: string;
  status: number;
  timeIn?: string | null;
  timeOut?: string | null;
  latIn?: number | null;
  lngIn?: number | null;
  latOut?: number | null;
  lngOut?: number | null;
  isAutoClosed?: boolean;
};

export async function getAttendanceDay(
  dateStr: string,
  mechanicId?: number | null,
): Promise<AttendanceDayRow[]> {
  const context = await loadAttendanceContext(dateStr, mechanicId);
  const rowsByMechanic = new Map(
    context.attendance.map((row) => [row.mechanic_id, row]),
  );
  const now = nowISTInfo();

  return context.mechanics.map((mechanic) => {
    const row = rowsByMechanic.get(mechanic.id);
    const duty = dutyFor(context.rows, dateStr, context.bizDuty);
    const day = computeDay(
      {
        curr_date: dateStr,
        status: row?.status ?? 0,
        time_in: row?.time_in ?? null,
        time_out: row?.time_out ?? null,
      },
      duty,
      now,
    );

    return {
      mechanicId: mechanic.id,
      name: `${mechanic.firstname} ${mechanic.lastname}`.trim(),
      status: row?.status ?? 0,
      timeIn: row?.time_in ?? null,
      timeOut: row?.time_out ?? null,
      effectiveOut: day.effOut,
      workedMin: day.workedMin,
      otMin: day.otMin,
      isAutoClosed: day.isAutoClosed,
      working: day.working,
      lateInMin: day.lateInMin,
      duty,
      latIn: row?.lat_in ?? null,
      lngIn: row?.lng_in ?? null,
      latOut: row?.lat_out ?? null,
      lngOut: row?.lng_out ?? null,
    };
  });
}

export async function getAttendanceMonth(
  monthStr: string,
  mechanicId?: number | null,
): Promise<AttendanceMonthMechanic[]> {
  const { first, last } = istMonthDays(monthStr);
  const supabase = await createClient();
  const allMechanics = await getActiveMechanics();
  const mechanics =
    typeof mechanicId === "number"
      ? allMechanics.filter((mechanic) => mechanic.id === mechanicId)
      : allMechanics;
  const ids = mechanics.map((mechanic) => mechanic.id);
  if (!ids.length) return [];

  const [attendance, dutyContext] = await Promise.all([
    supabase
      .from("attendance_list")
      .select(
        "id, mechanic_id, status, curr_date, time_in, time_out, worked_min, ot_min",
      )
      .gte("curr_date", first)
      .lte("curr_date", last)
      .in("mechanic_id", ids)
      .order("curr_date"),
    loadDutyContext(last, ids),
  ]);
  const rows = unwrap(attendance, "attendance.month");

  return mechanics.map((mechanic) => {
    const days: AttendanceMonthMechanic["days"] = {};
    let present = 0;
    let halfDay = 0;
    let absent = 0;
    let workedMin = 0;
    let otMin = 0;

    for (const row of rows.filter((item) => item.mechanic_id === mechanic.id)) {
      const duty = dutyFor(
        dutyContext.rows,
        row.curr_date,
        dutyContext.bizDuty,
      );
      const day = computeDay(
        {
          curr_date: row.curr_date,
          status: row.status,
          time_in: row.time_in,
          time_out: row.time_out,
        },
        duty,
        nowISTInfo(),
      );
      days[row.curr_date] = {
        status: row.status,
        workedMin: day.workedMin,
        otMin: day.otMin,
      };
      if (row.status === 1) present += 1;
      else if (row.status === 3) halfDay += 1;
      else if (row.status === 2) absent += 1;
      workedMin += day.workedMin;
      otMin += day.otMin;
    }

    const dailySalary = mechanic.daily_salary ?? mechanic.salary_per_day ?? 0;
    return {
      mechanicId: mechanic.id,
      name: `${mechanic.firstname} ${mechanic.lastname}`.trim(),
      dailySalary,
      days,
      present,
      halfDay,
      absent,
      workedMin,
      otMin,
      salaryEarned: roundMoney(dailySalary * (present + halfDay / 2)),
    };
  });
}

export async function getGeofence(): Promise<Geofence> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("system_info")
      .select("meta_field, meta_value")
      .in("meta_field", [
        "geofence_enabled",
        "geofence_lat",
        "geofence_lng",
        "geofence_radius_m",
      ]),
    "attendance.geofence",
  );
  return parseGeofence(
    Object.fromEntries(rows.map((row) => [row.meta_field, row.meta_value])),
  );
}

export async function saveAttendance(rows: AttendanceUpsertInput[]) {
  if (!rows.length) return { saved: 0 };
  const supabase = await createClient();
  const context = await loadDutyContext(
    rows
      .map((row) => row.date)
      .sort()
      .at(-1) ?? todayIST(),
    rows.map((row) => row.mechanicId),
  );

  const payload = rows.map((row) => {
    const duty = dutyFor(context.rows, row.date, context.bizDuty);
    const attRow: AttRow = {
      curr_date: row.date,
      status: row.status,
      time_in: row.timeIn ? normTime(row.timeIn) : null,
      time_out: row.timeOut ? normTime(row.timeOut) : null,
    };
    const derived =
      attRow.time_in || row.status === 2
        ? derivedCols(attRow, duty)
        : CLEAR_DERIVED_COLS;

    return {
      mechanic_id: row.mechanicId,
      curr_date: row.date,
      status: row.status,
      time_in: attRow.time_in,
      time_out: attRow.time_out,
      lat_in: row.latIn ?? null,
      lng_in: row.lngIn ?? null,
      lat_out: row.latOut ?? null,
      lng_out: row.lngOut ?? null,
      ...derived,
      ...(row.isAutoClosed ? { is_auto_closed: true } : {}),
    };
  });

  assertOk(
    await supabase
      .from("attendance_list")
      .upsert(payload, { onConflict: "mechanic_id,curr_date" }),
    "attendance.save",
  );

  return { saved: payload.length };
}

export async function selfCheckIn(input: {
  mechanicId: number;
  lat?: number | null;
  lng?: number | null;
  date?: string;
}) {
  const date = input.date ?? todayIST();
  const existing = await getAttendanceRow(input.mechanicId, date);
  if (existing?.time_in) {
    return {
      status: existing.status,
      timeIn: existing.time_in,
      alreadyMarked: true,
    };
  }

  const timeIn = nowISTTime();
  const duty = await getDuty(input.mechanicId, date);
  const derived = derivedCols(
    { curr_date: date, status: 1, time_in: timeIn, time_out: null },
    duty,
  );

  const supabase = await createClient();
  assertOk(
    await supabase.from("attendance_list").upsert(
      {
        mechanic_id: input.mechanicId,
        curr_date: date,
        status: 1,
        time_in: timeIn,
        time_out: null,
        lat_in: input.lat ?? null,
        lng_in: input.lng ?? null,
        ...derived,
      },
      { onConflict: "mechanic_id,curr_date" },
    ),
    "attendance.checkIn",
  );

  await autoClosePreviousDays([input.mechanicId]);
  return { status: 1, timeIn, alreadyMarked: false };
}

export async function selfCheckOut(input: {
  mechanicId: number;
  lat?: number | null;
  lng?: number | null;
  date?: string;
}) {
  const date = input.date ?? todayIST();
  const existing = await getAttendanceRow(input.mechanicId, date);
  if (!existing?.time_in) {
    return { error: "Check-in pehle karo." as const };
  }
  if (existing.time_out) {
    return {
      status: existing.status,
      timeOut: existing.time_out,
      alreadyMarked: true,
    };
  }

  const timeOut = nowISTTime();
  const duty = await getDuty(input.mechanicId, date);
  const derived = derivedCols(
    {
      curr_date: date,
      status: existing.status,
      time_in: existing.time_in,
      time_out: timeOut,
    },
    duty,
  );

  const supabase = await createClient();
  assertOk(
    await supabase.from("attendance_list").upsert(
      {
        mechanic_id: input.mechanicId,
        curr_date: date,
        status: existing.status,
        time_in: existing.time_in,
        time_out: timeOut,
        lat_out: input.lat ?? null,
        lng_out: input.lng ?? null,
        ...derived,
      },
      { onConflict: "mechanic_id,curr_date" },
    ),
    "attendance.checkOut",
  );

  return { status: existing.status, timeOut, alreadyMarked: false };
}

/** Persists effective checkout for earlier open days (audit columns). */
export async function autoClosePreviousDays(mechanicIds: number[]) {
  if (!mechanicIds.length) return 0;
  const supabase = await createClient();
  const today = todayIST();

  const rows = unwrap(
    await supabase
      .from("attendance_list")
      .select("id, mechanic_id, curr_date, status, time_in, time_out")
      .in("mechanic_id", mechanicIds)
      .lt("curr_date", today)
      .not("time_in", "is", null)
      .is("time_out", null)
      .order("curr_date"),
    "attendance.openDays",
  );

  let closed = 0;
  for (const row of rows) {
    const duty = await getDuty(row.mechanic_id, row.curr_date);
    const day = computeDay(
      {
        curr_date: row.curr_date,
        status: row.status,
        time_in: row.time_in,
        time_out: null,
      },
      duty,
      nowISTInfo(),
    );
    if (!day.isAutoClosed || !day.effOut) continue;

    assertOk(
      await supabase
        .from("attendance_list")
        .update({
          time_out: day.effOut,
          worked_min: day.workedMin,
          ot_min: day.otMin,
          duty_min: day.dutyMin,
          is_auto_closed: true,
        })
        .eq("id", row.id),
      "attendance.autoClose",
    );
    closed += 1;
  }
  return closed;
}

async function getAttendanceRow(mechanicId: number, date: string) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("attendance_list")
      .select(
        "id, mechanic_id, curr_date, status, time_in, time_out, lat_in, lng_in",
      )
      .eq("mechanic_id", mechanicId)
      .eq("curr_date", date)
      .maybeSingle(),
    "attendance.row",
  );
}

async function getDuty(mechanicId: number, date: string): Promise<Duty> {
  const context = await loadDutyContext(date, [mechanicId]);
  return dutyFor(context.rows, date, context.bizDuty);
}

async function getActiveMechanics() {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("mechanic_list")
      .select("id, firstname, lastname, daily_salary, salary_per_day")
      .eq("delete_flag", 0)
      .eq("status", 1)
      .order("firstname"),
    "attendance.mechanics",
  );
}

async function loadAttendanceContext(
  dateStr: string,
  mechanicId?: number | null,
) {
  const supabase = await createClient();
  const allMechanics = await getActiveMechanics();
  const mechanics =
    typeof mechanicId === "number"
      ? allMechanics.filter((mechanic) => mechanic.id === mechanicId)
      : allMechanics;
  const ids = mechanics.map((mechanic) => mechanic.id);

  let attendanceQuery = supabase
    .from("attendance_list")
    .select(
      "id, mechanic_id, status, curr_date, time_in, time_out, lat_in, lng_in, lat_out, lng_out",
    )
    .eq("curr_date", dateStr);
  if (typeof mechanicId === "number") {
    attendanceQuery = attendanceQuery.eq("mechanic_id", mechanicId);
  }

  const [attendanceRes, dutyContext] = await Promise.all([
    attendanceQuery,
    loadDutyContext(dateStr, ids),
  ]);

  return {
    mechanics,
    attendance: unwrap(attendanceRes, "attendance.day"),
    ...dutyContext,
  };
}

async function loadDutyContext(
  uptoDate: string,
  mechanicIds?: number[],
): Promise<{ rows: DutyScheduleRow[]; bizDuty: Duty }> {
  const supabase = await createClient();
  const ids =
    mechanicIds ?? (await getActiveMechanics()).map((mechanic) => mechanic.id);
  if (!ids.length) return { rows: [], bizDuty: DEFAULT_DUTY };

  const [dutyRes, systemRes] = await Promise.all([
    supabase
      .from("staff_duty_schedule")
      .select(
        "mechanic_id, duty_start, duty_end, break_minutes, effective_from",
      )
      .in("mechanic_id", ids)
      .lte("effective_from", uptoDate)
      .order("effective_from", { ascending: false }),
    supabase
      .from("system_info")
      .select("meta_field, meta_value")
      .in("meta_field", ["biz_open", "biz_close"]),
  ]);

  return {
    rows: unwrap(dutyRes, "attendance.duty"),
    bizDuty: bizDutyFromMeta(unwrap(systemRes, "attendance.bizHours")),
  };
}
