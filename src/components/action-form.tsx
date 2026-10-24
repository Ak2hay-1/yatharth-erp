"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rethrowRedirect } from "@/lib/utils";
import { actionErrorMessage } from "@/lib/filters";
import { isActionError } from "@/lib/run-action";

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
  return (
    <form
      id={id}
      className={className}
      onSubmit={(event) => {
        const empty = event.currentTarget.querySelector("[data-empty-required='true']");
        if (empty) {
          event.preventDefault();
          setError("Fill in the required fields.");
        }
      }}
      action={async (formData) => {
        setError(null);
        try {
          const result = await Promise.resolve(action(formData));
          if (isActionError(result)) {
            setError(result.error);
            return;
          }
          router.refresh();
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
