"use client";

import { useActionState, useState } from "react";

import {
  saveAttendanceAction,
  type AttendanceActionState,
} from "@/app/(app)/attendance/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants/status";
import { computeDay, fmtMins, nowISTInfo } from "@/lib/domain/attendance-hours";
import type { Duty } from "@/lib/domain/duty";
import { cn } from "@/lib/utils";

export type AttendanceDayRowView = {
  mechanicId: number;
  name: string;
  status: number;
  timeIn: string | null;
  timeOut: string | null;
  effectiveOut: string | null;
  isAutoClosed: boolean;
  duty: Duty;
};

type RowState = { status: number; timeIn: string; timeOut: string };

const initialState: AttendanceActionState = { error: null };

export function AttendanceDayForm({
  date,
  rows,
}: {
  date: string;
  rows: AttendanceDayRowView[];
}) {
  const [state, formAction, pending] = useActionState(
    saveAttendanceAction,
    initialState,
  );
  const [values, setValues] = useState<Record<number, RowState>>(() =>
    Object.fromEntries(
      rows.map((row) => [
        row.mechanicId,
        {
          status: row.status,
          timeIn: row.timeIn?.slice(0, 5) ?? "",
          timeOut: row.timeOut?.slice(0, 5) ?? "",
        },
      ]),
    ),
  );
  const now = nowISTInfo();

  function update(mechanicId: number, patch: Partial<RowState>) {
    setValues((current) => ({
      ...current,
      [mechanicId]: { ...current[mechanicId], ...patch },
    }));
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="date" value={date} />
      <input
        type="hidden"
        name="mechanic_ids"
        value={rows.map((row) => row.mechanicId).join(",")}
      />

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="border-success/30 bg-success/10 text-success rounded-md border px-3 py-2 text-sm">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setValues((current) =>
              Object.fromEntries(
                Object.entries(current).map(([id, row]) => [
                  id,
                  {
                    ...row,
                    status: 1,
                    timeIn: row.timeIn || "10:00",
                  },
                ]),
              ),
            )
          }
        >
          Mark all present
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save attendance"}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const value = values[row.mechanicId];
          const day = computeDay(
            {
              curr_date: date,
              status: value.status,
              time_in: value.timeIn || null,
              time_out: value.timeOut || null,
            },
            row.duty,
            now,
          );
          const absent = value.status === 2;
          return (
            <Card key={row.mechanicId} className="gap-3 py-4">
              <CardContent className="space-y-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.name}</p>
                    <p className="text-muted-foreground text-xs">
                      Duty {row.duty.start}–{row.duty.end}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {day.working ? (
                      <Badge variant="default">Working</Badge>
                    ) : null}
                    {day.isAutoClosed ? (
                      <Badge variant="warning">Auto-closed</Badge>
                    ) : null}
                    {day.lateInMin > 0 && value.status !== 2 ? (
                      <Badge variant="outline">
                        Late {fmtMins(day.lateInMin)}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="grid gap-1">
                    <label
                      htmlFor={`status_${row.mechanicId}`}
                      className="text-muted-foreground text-xs"
                    >
                      Status
                    </label>
                    <Select
                      id={`status_${row.mechanicId}`}
                      name={`status_${row.mechanicId}`}
                      value={value.status}
                      onChange={(event) =>
                        update(row.mechanicId, {
                          status: Number(event.target.value),
                        })
                      }
                    >
                      {(
                        Object.entries(ATTENDANCE_STATUS_LABELS) as Array<
                          [string, string]
                        >
                      ).map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <label
                      htmlFor={`in_${row.mechanicId}`}
                      className="text-muted-foreground text-xs"
                    >
                      Time in
                    </label>
                    <Input
                      id={`in_${row.mechanicId}`}
                      name={`in_${row.mechanicId}`}
                      type="time"
                      value={value.timeIn}
                      disabled={absent}
                      onChange={(event) =>
                        update(row.mechanicId, { timeIn: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <label
                      htmlFor={`out_${row.mechanicId}`}
                      className="text-muted-foreground text-xs"
                    >
                      Time out
                    </label>
                    <Input
                      id={`out_${row.mechanicId}`}
                      name={`out_${row.mechanicId}`}
                      type="time"
                      value={value.timeOut}
                      disabled={absent}
                      onChange={(event) =>
                        update(row.mechanicId, { timeOut: event.target.value })
                      }
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    "text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs",
                    absent && "opacity-60",
                  )}
                >
                  <span>
                    Worked{" "}
                    <span className="text-foreground font-medium">
                      {fmtMins(day.workedMin)}
                    </span>
                  </span>
                  <span>
                    OT{" "}
                    <span className="text-foreground font-medium">
                      {fmtMins(day.otMin)}
                    </span>
                  </span>
                  <span>
                    Out{" "}
                    <span className="text-foreground font-medium">
                      {day.effOut ?? "—"}
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          Koi active mechanic nahi mila.
        </p>
      ) : null}
    </form>
  );
}
