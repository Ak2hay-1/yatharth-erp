"use client";

import { actionErrorMessage } from "@/lib/filters";

function pageErrorMessage(error: Error & { digest?: string }) {
  const text = error.message ?? "";
  const redacted =
    text.includes("Server Components render") ||
    text.includes("Minified React error") ||
    text.includes("omitted in production");
  if (redacted) {
    return error.digest ? `This page could not be loaded. Reference: ${error.digest}` : "This page could not be loaded.";
  }
  return actionErrorMessage(error);
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-8">
      <h1 className="font-display text-2xl">Something went wrong</h1>
      <p className="mt-2 text-sm text-bad">{pageErrorMessage(error)}</p>
      <button
        type="button"
        className="mt-4 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
