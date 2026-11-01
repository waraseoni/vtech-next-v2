import { describe, expect, it } from "vitest";

import {
  deriveStatusFromTimes,
  dtLocalToIST,
  istDayRange,
  istMonthDays,
  istMonthRange,
  minsBetweenIST,
  toISTDatePart,
} from "./date";

describe("IST day range", () => {
  it("converts an IST calendar day to UTC instants", () => {
    expect(istDayRange("2026-11-01")).toEqual({
      start: "2026-11-01T00:00:00.000+05:30",
      end: "2026-11-01T23:59:59.999+05:30",
    });
  });

  it("spans the whole month, not just its last day", () => {
    expect(istMonthRange("2026-10")).toEqual({
      start: "2026-10-01T00:00:00.000+05:30",
      end: "2026-10-31T23:59:59.999+05:30",
    });
  });

  it("uses the real last day of the month", () => {
    expect(istMonthDays("2026-02")).toEqual({
      first: "2026-02-01",
      last: "2026-02-28",
    });
    expect(istMonthDays("2028-02").last).toBe("2028-02-29");
    expect(istMonthRange("2026-02").end).toBe("2026-02-28T23:59:59.999+05:30");
    expect(istMonthRange("2028-02").end).toBe("2028-02-29T23:59:59.999+05:30");
  });
});

describe("IST parsing helpers", () => {
  it("treats a bare datetime-local as IST wall-clock", () => {
    expect(dtLocalToIST("2026-11-01T14:30")).toBe("2026-11-01T14:30:00+05:30");
    expect(dtLocalToIST("2026-11-01T14:30:00Z")).toBe("2026-11-01T14:30:00Z");
  });

  it("formats an instant back to the IST date", () => {
    expect(toISTDatePart("2026-10-31T19:00:00Z")).toBe("2026-11-01");
    expect(toISTDatePart(null)).toBe("");
  });

  it("handles overnight minute spans", () => {
    expect(minsBetweenIST("22:00:00", "06:00:00")).toBe(480);
    expect(minsBetweenIST("10:00", null)).toBeNull();
  });

  it("derives half day below six hours", () => {
    expect(deriveStatusFromTimes(null, null)).toBeNull();
    expect(deriveStatusFromTimes("10:00", null)).toBe(1);
    expect(deriveStatusFromTimes("10:00", "16:00")).toBe(1);
    expect(deriveStatusFromTimes("10:00", "15:59")).toBe(3);
  });
});
