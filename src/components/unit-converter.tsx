"use client";

import { useMemo, useState } from "react";
import { Card, Field, Input } from "@/components/ui";

type Pair = { from: string; to: string; factor: number; label: string };

const PAIRS: Pair[] = [
  { from: "g", to: "kg", factor: 0.001, label: "Grams ↔ Kilograms" },
  { from: "ml", to: "L", factor: 0.001, label: "Millilitres ↔ Litres" },
];

/**
 * Display-only unit helper. Does not change stored inventory or recipe units.
 */
export function UnitConverter({ className }: { className?: string }) {
  const [pairIndex, setPairIndex] = useState(0);
  const [left, setLeft] = useState("1000");
  const pair = PAIRS[pairIndex] ?? PAIRS[0];

  const right = useMemo(() => {
    const n = Number(left);
    if (!Number.isFinite(n)) return "";
    const v = n * pair.factor;
    return Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/\.?0+$/, "");
  }, [left, pair]);

  function setFromRight(value: string) {
    setLeft(() => {
      const n = Number(value);
      if (!Number.isFinite(n)) return "";
      const v = n / pair.factor;
      return Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/\.?0+$/, "");
    });
  }

  return (
    <Card className={className ?? "p-4"}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base">Unit converter</h2>
        <select
          className="rounded-md border border-line bg-white px-2 py-1 text-xs"
          value={pairIndex}
          onChange={(e) => {
            setPairIndex(Number(e.target.value));
            setLeft("1000");
          }}
          aria-label="Conversion pair"
        >
          {PAIRS.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <p className="mb-3 text-xs text-muted">Helper only — does not change stock or recipe units.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={pair.from}>
          <Input
            inputMode="decimal"
            value={left}
            onChange={(e) => setLeft(e.target.value)}
          />
        </Field>
        <Field label={pair.to}>
          <Input
            inputMode="decimal"
            value={right}
            onChange={(e) => setFromRight(e.target.value)}
          />
        </Field>
      </div>
    </Card>
  );
}
