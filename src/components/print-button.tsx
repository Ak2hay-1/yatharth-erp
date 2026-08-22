"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white"
    >
      {label}
    </button>
  );
}
