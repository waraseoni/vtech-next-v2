"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import {
  checkClientDuplicates,
  saveClientAction,
  type ClientFormState,
} from "@/app/(app)/clients/actions";
import {
  ContactEditor,
  type ContactDraft,
} from "@/components/clients/contact-editor";
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
import type { DuplicateClient } from "@/lib/data/client-contacts";

export type ClientFormValues = {
  id?: number;
  firstname: string;
  middlename: string;
  lastname: string;
  contact: string;
  email: string;
  address: string;
  openingBalance: number;
  paymentDueDate: string;
  paymentDueRemarks: string;
  contacts?: ContactDraft[];
};

const initialState: ClientFormState = { error: null };

export function ClientForm({ initial }: { initial?: ClientFormValues }) {
  const [state, formAction, pending] = useActionState(
    saveClientAction,
    initialState,
  );
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [duplicates, setDuplicates] = useState<DuplicateClient[]>([]);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();

  const editing = Boolean(initial?.id);
  const cancelHref = editing ? `/clients/${initial?.id}` : "/clients";

  function runDuplicateCheck() {
    startCheck(async () => {
      const result = await checkClientDuplicates({
        contact,
        email,
        excludeId: initial?.id,
      });
      setDuplicates(result.duplicates);
      setDuplicateError(result.error);
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={initial?.id ?? ""} />

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
          <CardTitle>Client details</CardTitle>
          <CardDescription>Naam, contact aur billing info.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="firstname">First name *</Label>
            <Input
              id="firstname"
              name="firstname"
              required
              maxLength={80}
              defaultValue={initial?.firstname ?? ""}
              autoComplete="given-name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastname">Last name *</Label>
            <Input
              id="lastname"
              name="lastname"
              required
              maxLength={80}
              defaultValue={initial?.lastname ?? ""}
              autoComplete="family-name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="middlename">Middle name</Label>
            <Input
              id="middlename"
              name="middlename"
              maxLength={80}
              defaultValue={initial?.middlename ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact">Contact *</Label>
            <Input
              id="contact"
              name="contact"
              required
              maxLength={100}
              inputMode="tel"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              autoComplete="tel"
              placeholder="98765 43210"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              maxLength={120}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="opening_balance">Opening balance (₹)</Label>
            <Input
              id="opening_balance"
              name="opening_balance"
              type="number"
              step="0.01"
              defaultValue={initial ? String(initial.openingBalance) : "0"}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              name="address"
              required
              rows={2}
              maxLength={400}
              defaultValue={initial?.address ?? ""}
              autoComplete="street-address"
            />
          </div>

          <ContactEditor initialContacts={initial?.contacts ?? []} />

          <div className="grid gap-2">
            <Label htmlFor="payment_due_date">Payment due date</Label>
            <Input
              id="payment_due_date"
              name="payment_due_date"
              type="date"
              defaultValue={initial?.paymentDueDate ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment_due_remarks">Due remarks</Label>
            <Textarea
              id="payment_due_remarks"
              name="payment_due_remarks"
              rows={2}
              maxLength={300}
              defaultValue={initial?.paymentDueRemarks ?? ""}
              placeholder="Koi note (optional)"
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={runDuplicateCheck}
                disabled={checking || (!contact && !email)}
              >
                {checking ? "Checking…" : "Check duplicates"}
              </Button>
              <span className="text-muted-foreground text-xs">
                Same phone ya email wala client pehle se hai kya?
              </span>
            </div>
            {duplicateError ? (
              <p role="alert" className="text-destructive text-xs">
                {duplicateError}
              </p>
            ) : null}
            {duplicates.length ? (
              <div className="border-warning/40 bg-warning/10 rounded-md border px-3 py-2 text-xs">
                <p className="font-medium">
                  {duplicates.length} matching client
                  {duplicates.length === 1 ? "" : "s"} mila:
                </p>
                <ul className="mt-1 space-y-1">
                  {duplicates.map((duplicate) => (
                    <li key={duplicate.id}>
                      <Link
                        href={`/clients/${duplicate.id}`}
                        className="font-medium hover:underline"
                      >
                        {duplicate.firstname} {duplicate.lastname}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        · {duplicate.contact}
                        {duplicate.email ? ` · ${duplicate.email}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="flex-wrap gap-2 px-5">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Create client"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
