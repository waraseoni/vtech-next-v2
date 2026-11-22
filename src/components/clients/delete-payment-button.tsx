"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import {
  deleteClientPaymentAction,
  type PaymentFormState,
} from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";

const initialState: PaymentFormState = { error: null };

export function DeletePaymentButton({
  clientId,
  paymentId,
  amountLabel,
}: {
  clientId: number;
  paymentId: number;
  amountLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    deleteClientPaymentAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `${amountLabel} ka payment delete karein? Ye action undo nahi hota.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="payment_id" value={paymentId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={pending}
      >
        <Trash2 className="size-4" aria-hidden />
        {pending ? "Deleting…" : "Delete payment"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-destructive mt-1 text-xs">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
