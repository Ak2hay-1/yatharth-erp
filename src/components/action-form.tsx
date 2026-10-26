"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { rethrowRedirect } from "@/lib/utils";
import { actionErrorMessage } from "@/lib/filters";
import { isActionError, isActionRedirect } from "@/lib/run-action";

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
  const router = useRouter();
  const lock = useRef(false);
  return (
    <form
      id={id}
      className={className}
      onSubmit={(event) => {
        if (lock.current) {
          event.preventDefault();
          return;
        }
        const empty = event.currentTarget.querySelector("[data-empty-required='true']");
        if (empty) {
          event.preventDefault();
          setError("Fill in the required fields.");
          return;
        }
        lock.current = true;
      }}
      action={async (formData) => {
        setError(null);
        let holdLock = false;
        try {
          const result = await Promise.resolve(action(formData));
          if (isActionError(result)) {
            setError(result.error);
            return;
          }
          const href = isActionRedirect(result) ? result.redirectTo : null;
          // Leave this form transition before navigating or refreshing, so
          // useFormStatus does not stay on "Saving…" until that request ends.
          if (href) {
            holdLock = true;
            setTimeout(() => router.push(href), 0);
          } else {
            setTimeout(() => router.refresh(), 0);
          }
        } catch (e) {
          rethrowRedirect(e);
          setError(actionErrorMessage(e));
        } finally {
          if (!holdLock) lock.current = false;
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
