"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { requestPasswordReset, updatePassword, type AuthState } from "../actions";

export function ResetPasswordForm({ step }: { step: "request" | "update" }) {
  const action = step === "request" ? requestPasswordReset : updatePassword;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{step === "request" ? "Reset your password" : "Choose a new password"}</h1>
        <p className="mt-1 text-ink-500">
          {step === "request" ? "We'll email you a link." : "At least 8 characters."}
        </p>
      </div>
      <form action={formAction} className="space-y-4" noValidate>
        {step === "request" ? (
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required />
          </div>
        ) : (
          <div>
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </div>
        )}
        <FieldError>{state?.error}</FieldError>
        {state?.message && <p className="text-sm text-good-500">{state.message}</p>}
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "One moment…" : step === "request" ? "Send reset link" : "Save new password"}
        </Button>
      </form>
      <p className="text-center text-sm text-ink-500">
        <Link className="font-medium text-ink-900 underline" href="/login">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
