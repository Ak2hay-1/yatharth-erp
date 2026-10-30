"use client";

export function PrintButton({ label, className = "" }: { label: string; className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`no-print ${className}`}>
      {label}
    </button>
  );
}
