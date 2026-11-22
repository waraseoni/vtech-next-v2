"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  saveDueDateAction,
  type DueDateFormState,
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

const initialState: DueDateFormState = { error: null };

export function DueDateForm({
  clientId,
  clientName,
  dueDate,
  dueRemarks,
  cancelHref,
}: {
  clientId: number;
  clientName: string;
  dueDate: string;
  dueRemarks: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveDueDateAction,
    initialState,
  );

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
          <CardTitle>Payment due reminder</CardTitle>
          <CardDescription>{clientName}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="due_date">Due date</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={dueDate}
            />
            <p className="text-muted-foreground text-xs">
              Khali chhodne se reminder hat jayega.
            </p>
          </div>
          <div className="grid gap-2 sm:row-span-2">
            <Label htmlFor="due_remarks">Remarks</Label>
            <Textarea
              id="due_remarks"
              name="due_remarks"
              rows={3}
              maxLength={300}
              defaultValue={dueRemarks}
              placeholder="Kya promise kiya / kab tak"
            />
          </div>
        </CardContent>
        <CardFooter className="flex-wrap gap-2 px-5">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save due date"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
