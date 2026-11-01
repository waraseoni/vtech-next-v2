"use client";

import { useActionState } from "react";

import {
  updateJobStatusAction,
  type JobActionState,
} from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_TRANSITIONS,
  isJobStatus,
  type JobStatus,
} from "@/lib/constants/status";

const NEXT_LABEL: Partial<Record<JobStatus, string>> = {
  1: "Start work",
  2: "Finish",
  3: "Mark paid",
  5: "Deliver",
  4: "Cancel job",
};

const initialState: JobActionState = { error: null };

export function JobStatusActions({
  jobId,
  status,
}: {
  jobId: number;
  status: number;
}) {
  const [state, formAction, pending] = useActionState(
    updateJobStatusAction,
    initialState,
  );

  if (!isJobStatus(status)) return null;
  const targets = JOB_STATUS_TRANSITIONS[status];
  if (!targets.length) {
    return (
      <p className="text-muted-foreground text-sm">
        {JOB_STATUS_LABELS[status]} — koi next step nahi.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={jobId} />
      {state.error ? (
        <p role="alert" className="text-destructive text-xs">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {targets.map((target) => (
          <Button
            key={target}
            type="submit"
            name="status"
            value={target}
            size="sm"
            variant={target === 4 ? "outline" : "default"}
            disabled={pending}
            className={target === 4 ? "text-destructive" : undefined}
          >
            {NEXT_LABEL[target] ?? JOB_STATUS_LABELS[target]}
          </Button>
        ))}
      </div>
    </form>
  );
}
