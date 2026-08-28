"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function hasOpenOverlay() {
  if (typeof document === "undefined") return false;
  if (document.querySelector('[role="dialog"]')) return true;
  const expanded = document.querySelector('[aria-expanded="true"]');
  if (expanded) return true;
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    const tag = active.tagName;
    if (tag === "SELECT" || tag === "OPTION") return true;
    if (active.getAttribute("role") === "listbox" || active.closest('[role="listbox"]')) return true;
  }
  return false;
}

/** Esc closes overlays first (Modal already handles dialogs); otherwise navigate back. */
export function useEscapeBack(fallbackHref = "/dashboard") {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (hasOpenOverlay()) return;
      e.preventDefault();
      if (window.history.length > 1) router.back();
      else router.push(fallbackHref);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, fallbackHref]);
}

export function EscapeBackButton({
  fallbackHref = "/dashboard",
  className,
}: {
  fallbackHref?: string;
  className?: string;
}) {
  const router = useRouter();
  useEscapeBack(fallbackHref);

  return (
    <button
      type="button"
      title="Go back (Esc)"
      aria-label="Go back"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className={
        className ??
        "rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 hover:bg-white/10 hover:text-white"
      }
    >
      Esc
    </button>
  );
}
