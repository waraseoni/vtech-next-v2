import { describe, expect, it } from "vitest";

import { computeDay, derivedCols, type NowInfo } from "./attendance-hours";
import { DEFAULT_DUTY, dutyMinutes, normTime, rowToDuty } from "./duty";

const duty = { start: "10:00", end: "19:00", breakMinutes: 60 };
const now = (date: string, mins: number): NowInfo => ({ date, mins });

describe("duty helpers", () => {
  it("normalises PostgREST time values", () => {
    expect(normTime("10:05:00")).toBe("10:05");
    expect(normTime("24:00")).toBe("");
    expect(dutyMinutes(duty)).toBe(480);
    expect(dutyMinutes({ start: "22:00", end: "06:00", breakMinutes: 0 })).toBe(
      480,
    );
  });

  it("rejects invalid schedule rows", () => {
    expect(
      rowToDuty({
        mechanic_id: 1,
        duty_start: "10:00",
        duty_end: "10:00",
        effective_from: "2026-01-01",
      }),
    ).toBeNull();
    expect(
      rowToDuty({
        mechanic_id: 1,
        duty_start: "09:30:00",
        duty_end: "18:30:00",
        break_minutes: 30,
        effective_from: "2026-01-01",
      }),
    ).toEqual({ start: "09:30", end: "18:30", breakMinutes: 30 });
  });
});

describe("computeDay", () => {
  it("derives nothing without a check-in", () => {
    const day = computeDay(
      { curr_date: "2026-11-01", status: 2, time_in: null, time_out: null },
      duty,
      now("2026-11-01", 700),
    );
    expect(day.hasTimeIn).toBe(false);
    expect(
      derivedCols(
        { curr_date: "2026-11-01", status: 2, time_in: null, time_out: null },
        duty,
        now("2026-11-01", 700),
      ),
    ).toEqual({
      worked_min: null,
      ot_min: 0,
      duty_min: null,
      is_auto_closed: false,
    });
  });

  it("uses a real checkout and computes OT over duty minutes", () => {
    const day = computeDay(
      {
        curr_date: "2026-11-01",
        status: 1,
        time_in: "10:10:00",
        time_out: "20:10:00",
      },
      duty,
      now("2026-11-02", 600),
    );
    expect(day.isAutoClosed).toBe(false);
    expect(day.workedMin).toBe(600);
    expect(day.otMin).toBe(120);
    expect(day.lateInMin).toBe(10);
  });

  it("keeps an open day live while duty is running", () => {
    const day = computeDay(
      { curr_date: "2026-11-01", status: 1, time_in: "10:00", time_out: null },
      duty,
      now("2026-11-01", 13 * 60),
    );
    expect(day.working).toBe(true);
    expect(day.effOut).toBeNull();
    expect(day.workedMin).toBe(180);
    expect(day.otMin).toBe(0);
  });

  it("auto-closes a past day at duty end with zero OT", () => {
    const day = computeDay(
      { curr_date: "2026-10-31", status: 1, time_in: "10:00", time_out: null },
      duty,
      now("2026-11-01", 660),
    );
    expect(day.isAutoClosed).toBe(true);
    expect(day.effOut).toBe("19:00");
    expect(day.workedMin).toBe(540);
    expect(day.otMin).toBe(0);
  });

  it("supports overnight duty", () => {
    const night = { start: "22:00", end: "06:00", breakMinutes: 0 };
    const day = computeDay(
      {
        curr_date: "2026-11-01",
        status: 1,
        time_in: "22:00",
        time_out: "06:30",
      },
      night,
      now("2026-11-02", 400),
    );
    expect(day.workedMin).toBe(510);
    expect(day.otMin).toBe(30);
    expect(day.dutyMin).toBe(480);
  });

  it("falls back to the default duty shape", () => {
    expect(DEFAULT_DUTY).toEqual({
      start: "10:00",
      end: "20:00",
      breakMinutes: 0,
    });
  });
});
