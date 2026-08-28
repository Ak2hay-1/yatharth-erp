"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Escape on label print preview returns to the labelling item page. */
export function LabelPrintEscape({ itemId }: { itemId: string }) {
  const router = useRouter();
  const href = `/masters/labelling/${itemId}`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      router.push(href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, href]);

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:bg-bg hover:text-ink"
    >
      Esc · Back
    </button>
  );
}
