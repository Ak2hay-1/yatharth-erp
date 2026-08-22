"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button
        type="button"
        className="fixed inset-0 bg-ink/50"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 my-auto w-full max-w-3xl rounded-xl border border-line bg-white shadow-xl",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id={titleId} className="font-display text-lg text-ink">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-lg p-2 text-muted hover:bg-bg hover:text-ink"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[min(80vh,720px)] overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
