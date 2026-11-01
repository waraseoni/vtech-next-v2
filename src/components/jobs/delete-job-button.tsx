"use client";

import { useActionState } from "react";

import { deleteJobAction, type JobActionState } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";

const initialState: JobActionState = { error: null };

export function DeleteJobButton({ jobId }: { jobId: number }) {
  const [state, formAction, pending] = useActionState(
    deleteJobAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Ye job delete (soft) karni hai? List se hat jayegi, data DB me rahega.",
          )
        ) {
          event.preventDefault();
        }
      }}
      className="space-y-1"
    >
      <input type="hidden" name="id" value={jobId} />
      {state.error ? (
        <p role="alert" className="text-destructive text-xs">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? "Deleting…" : "Delete"}
      </Button>
    </form>
  );
}
