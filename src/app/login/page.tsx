"use client";

import { useActionState } from "react";
import { loginAction } from "@/server/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-forest p-6">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-2xl">
        <div className="mb-8">
          <BrandLogo height={52} className="mx-auto" priority />
          <p className="mt-5 text-center text-sm text-muted">
            Sign in with the account created for you by a Super Admin.
          </p>
        </div>
        <form action={action} className="space-y-4">
          <Field label="Email">
            <Input name="email" type="email" required autoComplete="username" />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" required autoComplete="current-password" />
          </Field>
          {state?.error ? <p className="text-sm text-bad">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-xs text-muted">
          There is no self-registration. Ask your Super Admin if you need a login.
        </p>
      </div>
    </div>
  );
}
