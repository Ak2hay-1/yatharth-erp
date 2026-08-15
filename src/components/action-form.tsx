"use client";

import { useState } from "react";
import { rethrowRedirect } from "@/lib/utils";
import { actionErrorMessage } from "@/lib/filters";

export function ActionForm({
  action,
  children,
  className,
  id,
}: {
  action: (formData: FormData) => Promise<unknown> | void;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      id={id}
      className={className}
      action={async (formData) => {
        setError(null);
        try {
          await Promise.resolve(action(formData));
        } catch (e) {
          rethrowRedirect(e);
          setError(actionErrorMessage(e));
        }
      }}
    >
      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-bad" role="alert">
          {error}
        </p>
      ) : null}
      {children}
    </form>
  );
}
