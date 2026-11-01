"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import {
  deleteClientAction,
  type DeleteClientState,
} from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";

const initialState: DeleteClientState = { error: null };

export function DeleteClientButton({ id, name }: { id: number; name: string }) {
  const [state, formAction, pending] = useActionState(
    deleteClientAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `${name} ko delete karein? Records archive ho jayenge (soft delete).`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={pending}
      >
        <Trash2 className="size-4" aria-hidden />
        {pending ? "Deleting…" : "Delete"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-destructive mt-1 text-xs">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
