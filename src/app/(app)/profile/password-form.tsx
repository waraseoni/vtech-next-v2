"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

import { updatePasswordAction, type ProfileActionState } from "./actions";

const initialState: ProfileActionState = { error: null };

export function PasswordForm() {
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state.message]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="current-password">Purana password</Label>
        <PasswordInput
          id="current-password"
          name="current"
          required
          autoComplete="current-password"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="new-password">Naya password</Label>
        <PasswordInput
          id="new-password"
          name="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
        />
        <p className="text-muted-foreground text-xs">
          8–72 characters. Purana password turant band ho jayega.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="confirm-password">Naya password confirm karein</Label>
        <PasswordInput
          id="confirm-password"
          name="confirm"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
        />
      </div>

      <label className="text-muted-foreground flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          name="signOutOthers"
          value="1"
          defaultChecked
          className="accent-primary mt-0.5 size-3.5"
        />
        <span>Baaki sabhi devices se sign out kar dein (recommended).</span>
      </label>

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p
          role="status"
          className="border-success/30 bg-success/10 text-success rounded-md border px-3 py-2 text-sm"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Update ho raha…" : "Password update karein"}
      </Button>
    </form>
  );
}
