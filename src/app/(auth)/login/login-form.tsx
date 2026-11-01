"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm({
  next,
  lastEmail = "",
  lastLoginLabel = null,
}: {
  next?: string;
  lastEmail?: string;
  lastLoginLabel?: string | null;
}) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="next" value={next ?? ""} />

      {lastLoginLabel ? (
        <p className="border-input bg-muted/40 text-muted-foreground rounded-md border px-3 py-2 text-xs">
          Pichhli login:{" "}
          <span className="text-foreground">{lastLoginLabel}</span>
          {lastEmail ? (
            <>
              {" · "}
              <span className="text-foreground">{lastEmail}</span>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@vtech.local"
          defaultValue={lastEmail}
          required
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
