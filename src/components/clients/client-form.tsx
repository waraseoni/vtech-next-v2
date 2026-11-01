"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  saveClientAction,
  type ClientFormState,
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
import { MAX_CLIENT_PHOTO_BYTES, compressPhoto } from "@/lib/images";

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
};

const initialState: ClientFormState = { error: null };

export function ClientForm({
  initial,
  photoUrl,
}: {
  initial?: ClientFormValues;
  photoUrl?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveClientAction,
    initialState,
  );
  const [preview, setPreview] = useState<string | null>(photoUrl ?? null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setPhotoError(null);
    if (!file) return;

    try {
      const compressed = await compressPhoto(file);
      if (compressed.size > MAX_CLIENT_PHOTO_BYTES) {
        throw new Error("Photo 1 MB se choti honi chahiye.");
      }
      const transfer = new DataTransfer();
      transfer.items.add(compressed);
      input.files = transfer.files;

      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      const next = URL.createObjectURL(compressed);
      objectUrl.current = next;
      setPreview(next);
    } catch (error) {
      input.value = "";
      setPhotoError(
        error instanceof Error ? error.message : "Photo sahi nahi hai.",
      );
    }
  }

  const editing = Boolean(initial?.id);
  const cancelHref = editing ? `/clients/${initial?.id}` : "/clients";

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
          <CardDescription>
            Naam, contact aur billing info. Photo optional hai (max 1 MB).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
          <div className="flex items-center gap-4 sm:col-span-2">
            <span className="bg-muted grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border">
              {preview ? (
                <Image
                  src={preview}
                  alt="Client photo preview"
                  width={80}
                  height={80}
                  unoptimized
                  className="size-20 object-cover"
                />
              ) : (
                <span className="text-muted-foreground text-xs">No photo</span>
              )}
            </span>
            <div className="space-y-1.5">
              <Label htmlFor="photo">Photo</Label>
              <Input
                id="photo"
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhoto}
                className="h-auto py-1.5"
              />
              <p className="text-muted-foreground text-xs">
                JPG/PNG/WebP. Badi image browser me compress ho jayegi.
              </p>
              {photoError ? (
                <p className="text-destructive text-xs">{photoError}</p>
              ) : null}
            </div>
          </div>

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
              defaultValue={initial?.contact ?? ""}
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
              defaultValue={initial?.email ?? ""}
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
