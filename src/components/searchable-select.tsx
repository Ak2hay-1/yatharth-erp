"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SearchOption = { id: string; label: string; sub?: string };

export function SearchableSelect({
  name,
  value,
  onChange,
  options,
  placeholder = "Search…",
  required,
  disabled,
  createLabel,
  onRequestCreate,
}: {
  name?: string;
  value: string;
  onChange: (id: string) => void;
  options: SearchOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  createLabel?: string;
  onRequestCreate?: (query: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.id === value);
  const canCreate = Boolean(onRequestCreate && createLabel);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 40);
    return options
      .filter((o) => `${o.label} ${o.sub ?? ""}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [options, query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function requestCreate() {
    const seed = open ? query.trim() : selected?.label ?? query.trim();
    onRequestCreate?.(seed);
    setOpen(false);
  }

  return (
    <div ref={root} className="relative">
      {name ? <input type="hidden" name={name} value={value} required={required && !value} /> : null}
      <input
        className={cn(
          "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-saffron focus:ring-2 focus:ring-saffron/20",
          disabled && "opacity-50",
        )}
        value={open ? query : selected ? selected.label : query}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter") {
            e.preventDefault();
            const first = filtered[0];
            if (first) {
              onChange(first.id);
              setQuery("");
              setOpen(false);
            } else if (canCreate) {
              requestCreate();
            }
          }
        }}
      />
      {open ? (
        <ul
          id={listId}
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No matches</li>
          ) : (
            filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-bg",
                    o.id === value && "bg-sprout/40",
                  )}
                  onClick={() => {
                    onChange(o.id);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <div className="font-medium">{o.label}</div>
                  {o.sub ? <div className="text-xs text-muted">{o.sub}</div> : null}
                </button>
              </li>
            ))
          )}
          {canCreate ? (
            <li className="border-t border-line">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-semibold text-saffron hover:bg-saffron/10"
                onClick={requestCreate}
              >
                {createLabel}
                {query.trim() ? ` “${query.trim()}”` : ""}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
