"use client";

import { Lock, LockOpen, Trash2 } from "lucide-react";
import { useActionState } from "react";

import {
  deleteClientLoanAction,
  setClientLoanStatusAction,
  type LoanFormState,
} from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";

const initialState: LoanFormState = { error: null };

export function LoanActions({
  clientId,
  loanId,
  status,
  canDelete,
}: {
  clientId: number;
  loanId: number;
  status: number | null;
  canDelete: boolean;
}) {
  const [statusState, statusAction, statusPending] = useActionState(
    setClientLoanStatusAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteClientLoanAction,
    initialState,
  );
  const active = status === 1;

  return (
    <div className="flex flex-wrap items-center gap-1">
      <form action={statusAction}>
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="loan_id" value={loanId} />
        <input type="hidden" name="status" value={active ? "0" : "1"} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={statusPending}
        >
          {active ? (
            <Lock className="size-3.5" aria-hidden />
          ) : (
            <LockOpen className="size-3.5" aria-hidden />
          )}
          {active ? "Close" : "Reopen"}
        </Button>
      </form>
      {canDelete ? (
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `Loan #${loanId} delete karein? Iske EMI payment records alag rahenge.`,
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="loan_id" value={loanId} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={deletePending}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Delete
          </Button>
        </form>
      ) : null}
      {statusState.error ? (
        <p role="alert" className="text-destructive text-xs">
          {statusState.error}
        </p>
      ) : null}
      {deleteState.error ? (
        <p role="alert" className="text-destructive text-xs">
          {deleteState.error}
        </p>
      ) : null}
    </div>
  );
}
