"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setJobStatusAction } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_TRANSITIONS,
  isJobStatus,
  type JobStatus,
} from "@/lib/constants/status";
import { nowISTDateTimeLocal } from "@/lib/date";

const NEXT_LABEL: Partial<Record<JobStatus, string>> = {
  1: "Start work",
  2: "Finish",
  3: "Mark paid",
  5: "Deliver",
  4: "Cancel job",
};

const EXPLANATION: Record<JobStatus, string> = {
  0: "Job pending hai. Abhi koi action nahi.",
  1: "Repair shuru kar dein.",
  2: "Repair complete mark karein.",
  3: "Payment settle ho gaya.",
  4: "Job cancel kar dein. Ye action final hai.",
  5: "Job deliver karein. Delivery date/time confirm karein.",
};

export function JobStatusActions({
  jobId,
  status,
}: {
  jobId: number;
  status: number;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<JobStatus | null>(null);
  const [deliveryAt, setDeliveryAt] = useState(nowISTDateTimeLocal);
  const [pending, startTransition] = useTransition();

  if (!isJobStatus(status)) return null;
  const targets = JOB_STATUS_TRANSITIONS[status];
  if (!targets.length) {
    return (
      <p className="text-muted-foreground text-sm">
        {JOB_STATUS_LABELS[status]} — koi next step nahi.
      </p>
    );
  }

  function confirm() {
    if (target === null) return;
    const next = target;
    startTransition(async () => {
      const result = await setJobStatusAction({
        id: jobId,
        status: next,
        dateCompleted: next === 5 ? deliveryAt : null,
      });
      if (result.ok) {
        toast.success(`Status ${JOB_STATUS_LABELS[next]} ho gaya.`);
        setTarget(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {targets.map((next) => (
          <Button
            key={next}
            type="button"
            size="sm"
            variant={next === 4 ? "outline" : "default"}
            className={next === 4 ? "text-destructive" : undefined}
            onClick={() => {
              setDeliveryAt(nowISTDateTimeLocal());
              setTarget(next);
            }}
          >
            {NEXT_LABEL[next] ?? JOB_STATUS_LABELS[next]}
          </Button>
        ))}
      </div>

      {target !== null ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Update job status"
        >
          <div className="bg-background w-full max-w-md space-y-4 rounded-lg border p-5 shadow-xl">
            <div>
              <p className="text-muted-foreground text-xs">New status</p>
              <h3 className="mt-1 text-lg font-semibold">
                {JOB_STATUS_LABELS[target]}
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {EXPLANATION[target]}
              </p>
            </div>

            {target === 5 ? (
              <div className="grid gap-2">
                <Label htmlFor="delivery-at">Delivery date &amp; time</Label>
                <Input
                  id="delivery-at"
                  type="datetime-local"
                  value={deliveryAt}
                  max={nowISTDateTimeLocal()}
                  onChange={(event) => setDeliveryAt(event.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Backdated delivery ho gayi thi to sahi time enter karein.
                </p>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTarget(null)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={target === 4 ? "destructive" : "default"}
                onClick={confirm}
                disabled={pending}
              >
                {pending ? "Saving…" : "Update status"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
