"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  saveClientPaymentAction,
  type PaymentFormState,
} from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_MODES, PAYMENT_TYPES } from "@/lib/data/payment-input";

export type PaymentFormValues = {
  id?: number;
  amount: number;
  discount: number;
  paymentDate: string;
  paymentMode: string;
  paymentType: string;
  jobId: string;
  billNo: string;
  loanId: number;
  remarks: string;
};

export type PaymentLoanOption = {
  id: number;
  label: string;
  emi: number;
};

const initialState: PaymentFormState = { error: null };

export function PaymentForm({
  clientId,
  clientName,
  today,
  initial,
  loanOptions = [],
  cancelHref,
}: {
  clientId: number;
  clientName: string;
  today: string;
  initial?: PaymentFormValues;
  loanOptions?: PaymentLoanOption[];
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveClientPaymentAction,
    initialState,
  );
  const editing = Boolean(initial?.id);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="payment_id" value={initial?.id ?? 0} />

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      <Card className="gap-5 py-5">
        <CardHeader className="px-5">
          <CardTitle>{editing ? "Edit payment" : "Add payment"}</CardTitle>
          <CardDescription>{clientName}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (₹) *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              defaultValue={initial ? String(initial.amount) : ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="discount">Discount (₹)</Label>
            <Input
              id="discount"
              name="discount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initial ? String(initial.discount) : "0"}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment_date">Payment date *</Label>
            <Input
              id="payment_date"
              name="payment_date"
              type="date"
              required
              defaultValue={initial?.paymentDate ?? today}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment_mode">Mode *</Label>
            <Select
              id="payment_mode"
              name="payment_mode"
              defaultValue={initial?.paymentMode ?? "Cash"}
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment_type">Type *</Label>
            <Select
              id="payment_type"
              name="payment_type"
              defaultValue={initial?.paymentType ?? "Full"}
            >
              {PAYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="loan_id">Loan (EMI)</Label>
            <Select
              id="loan_id"
              name="loan_id"
              defaultValue={String(initial?.loanId ?? 0)}
            >
              <option value="0">Not a loan payment</option>
              {loanOptions.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="job_id">Job id</Label>
            <Input
              id="job_id"
              name="job_id"
              maxLength={50}
              defaultValue={initial?.jobId ?? ""}
              placeholder="Links to jobsheet (optional)"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bill_no">Bill no</Label>
            <Input
              id="bill_no"
              name="bill_no"
              maxLength={50}
              defaultValue={initial?.billNo ?? ""}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              name="remarks"
              rows={2}
              maxLength={300}
              defaultValue={initial?.remarks ?? ""}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-wrap gap-2 px-5">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Save payment"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
