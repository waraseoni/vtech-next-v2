export const JOB_STATUS = {
  pending: 0,
  inProgress: 1,
  finished: 2,
  paid: 3,
  cancelled: 4,
  delivered: 5,
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  0: "Pending",
  1: "In progress",
  2: "Finished",
  3: "Paid",
  4: "Cancelled",
  5: "Delivered",
};

export function isJobStatus(value: number): value is JobStatus {
  return value in JOB_STATUS_LABELS;
}

/** Forward-only flow; cancel (4) is allowed until the job is delivered. */
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  0: [1, 4],
  1: [2, 4],
  2: [3, 4],
  3: [5, 4],
  4: [],
  5: [],
};

export function canTransitionJobStatus(
  from: number,
  to: number,
): to is JobStatus {
  return (
    isJobStatus(from) &&
    isJobStatus(to) &&
    JOB_STATUS_TRANSITIONS[from].includes(to)
  );
}

export const ATTENDANCE_STATUS = {
  unmarked: 0,
  present: 1,
  absent: 2,
  halfDay: 3,
} as const;

export type AttendanceStatus =
  (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  0: "Unmarked",
  1: "Present",
  2: "Absent",
  3: "Half day",
};

export function isAttendanceStatus(value: number): value is AttendanceStatus {
  return value in ATTENDANCE_STATUS_LABELS;
}
