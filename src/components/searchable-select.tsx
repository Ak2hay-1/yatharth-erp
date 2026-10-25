"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SearchOption = { id: string; label: string; sub?: string; search?: string };

function optionHaystack(option: SearchOption) {
  return (option.search ?? `${option.label} ${option.sub ?? ""}`).toLowerCase();
}

function optionMatches(option: SearchOption, query: string) {
  const hay = optionHaystack(option);
  if (hay.includes(query)) return true;
  const digits = query.replace(/\D/g, "");
  if (digits.length >= 4 && hay.replace(/\D/g, "").includes(digits)) return true;
  return false;
}

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
  const [submitted, setSubmitted] = useState(false);
  const openedBlank = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    const form = root.current?.closest("form");
    if (!form) return;
    const onSubmit = () => setSubmitted(true);
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);
  const canCreate = Boolean(onRequestCreate && createLabel);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 40);
    return options.filter((o) => optionMatches(o, q)).slice(0, 40);
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
    <div ref={root} className="relative" data-empty-required={required && !value ? "true" : undefined}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <input
        className={cn(
          "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-saffron focus:ring-2 focus:ring-saffron/20",
          disabled && "opacity-50",
        )}
        value={open ? query : selected ? selected.label : query}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onMouseDown={() => {
          if (disabled || open) return;
          openedBlank.current = true;
          setQuery("");
          setOpen(true);
        }}
        onFocus={() => {
          openedBlank.current = true;
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          let next = e.target.value;
          const label = selected?.label ?? "";
          if (label && query === "" && next.startsWith(label)) next = next.slice(label.length);
          if (openedBlank.current && next === "") {
            openedBlank.current = false;
            setQuery("");
            setOpen(true);
            return;
          }
          openedBlank.current = false;
          setQuery(next);
          setOpen(true);
          if (!next) onChange("");
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
                  onMouseDown={(e) => {
                    e.preventDefault();
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
          {!query.trim() && options.length > 40 ? (
            <li className="px-3 py-2 text-xs text-muted">Type to search all {options.length}.</li>
          ) : null}
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
      {required && submitted && !value ? <p className="mt-1 text-xs text-bad">Required</p> : null}
      {value && !selected ? <p className="mt-1 text-xs text-muted">Not in the list</p> : null}
    </div>
  );
}
