"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { signIn, signInWithGoogle, signUp, type AuthState } from "./actions";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-ink-500">
          {mode === "login" ? "Pick up where you left off." : "Free to start. No card needed."}
        </p>
      </div>

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next ?? "/home"} />
        <Button type="submit" variant="ghost" fullWidth className="border border-ink-300 bg-white">
          Continue with Google
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-ink-500">
        <span className="h-px flex-1 bg-ink-100" /> or <span className="h-px flex-1 bg-ink-100" />
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next ?? "/home"} />
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
        </div>
        <FieldError>{state?.error}</FieldError>
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-500">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link className="font-medium text-ink-900 underline" href="/signup">
              Create an account
            </Link>
            {" · "}
            <Link className="font-medium text-ink-900 underline" href="/reset-password">
              Forgot password
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link className="font-medium text-ink-900 underline" href="/login">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
