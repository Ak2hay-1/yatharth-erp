"use client";

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
      <p className="mt-2 text-sm text-bad">{error.message}</p>
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
