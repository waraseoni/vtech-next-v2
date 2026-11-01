import { describe, expect, it } from "vitest";

import {
  ATTENDANCE_STATUS_LABELS,
  JOB_STATUS,
  JOB_STATUS_LABELS,
  canTransitionJobStatus,
  isAttendanceStatus,
  isJobStatus,
} from "./status";

describe("job status", () => {
  it("maps every persisted code to a label", () => {
    expect(Object.keys(JOB_STATUS_LABELS)).toHaveLength(6);
    expect(JOB_STATUS_LABELS[JOB_STATUS.delivered]).toBe("Delivered");
  });

  it("guards out-of-range values", () => {
    expect(isJobStatus(5)).toBe(true);
    expect(isJobStatus(6)).toBe(false);
    expect(isJobStatus(-1)).toBe(false);
  });

  it("allows forward transitions and cancel until delivered", () => {
    expect(canTransitionJobStatus(0, 1)).toBe(true);
    expect(canTransitionJobStatus(2, 3)).toBe(true);
    expect(canTransitionJobStatus(3, 5)).toBe(true);
    expect(canTransitionJobStatus(1, 4)).toBe(true);
    expect(canTransitionJobStatus(3, 1)).toBe(false);
    expect(canTransitionJobStatus(5, 4)).toBe(false);
    expect(canTransitionJobStatus(4, 1)).toBe(false);
    expect(canTransitionJobStatus(0, 6)).toBe(false);
  });
});

describe("attendance status", () => {
  it("maps every persisted code to a label", () => {
    expect(Object.keys(ATTENDANCE_STATUS_LABELS)).toHaveLength(4);
    expect(ATTENDANCE_STATUS_LABELS[3]).toBe("Half day");
  });

  it("guards out-of-range values", () => {
    expect(isAttendanceStatus(0)).toBe(true);
    expect(isAttendanceStatus(4)).toBe(false);
  });
});
