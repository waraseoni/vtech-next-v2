"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  saveClientLoanAction,
  type LoanFormState,
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
import { Textarea } from "@/components/ui/textarea";
import { computeLoanTerms } from "@/lib/domain/client-loan";
import { formatINR } from "@/lib/money";

const initialState: LoanFormState = { error: null };

export function LoanForm({
  clientId,
  clientName,
  today,
  cancelHref,
}: {
  clientId: number;
  clientName: string;
  today: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveClientLoanAction,
    initialState,
  );
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("12");
  const [months, setMonths] = useState("12");

  const terms = computeLoanTerms({
    principal: Number(principal) || 0,
    annualRate: Number(rate) || 0,
    months: Number(months) || 1,
  });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="client_id" value={clientId} />

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
          <CardTitle>Give loan</CardTitle>
          <CardDescription>{clientName}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="principal">Principal (₹) *</Label>
            <Input
              id="principal"
              name="principal"
              type="number"
              min="1"
              step="0.01"
              required
              value={principal}
              onChange={(event) => setPrincipal(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="interest_rate">Interest rate (% flat)</Label>
            <Input
              id="interest_rate"
              name="interest_rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="months">Months *</Label>
            <Input
              id="months"
              name="months"
              type="number"
              min="1"
              max="120"
              step="1"
              required
              value={months}
              onChange={(event) => setMonths(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="loan_date">Loan date *</Label>
            <Input
              id="loan_date"
              name="loan_date"
              type="date"
              required
              defaultValue={today}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              name="remarks"
              rows={2}
              maxLength={300}
              placeholder="Purpose ya note (optional)"
            />
          </div>

          <div className="bg-muted/40 grid gap-1.5 rounded-lg border px-4 py-3 text-sm sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Interest</span>
              <span className="font-medium tabular-nums">
                {formatINR(terms.interest)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Total payable</span>
              <span className="font-medium tabular-nums">
                {formatINR(terms.totalPayable)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Monthly EMI</span>
              <span className="font-semibold tabular-nums">
                {formatINR(terms.emi)}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Flat simple interest: principal + principal × rate ÷ 100, phir
              months me divide.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex-wrap gap-2 px-5">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save loan"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
