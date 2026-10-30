"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";

type ProductCardActionsProps = {
  sku: string;
  name: string;
  packSize: string;
  rateB2b: number;
  category: string;
  imageUrl?: string;
  enquireHref: string;
  variant?: "card" | "detail";
};

export function ProductCardActions({
  sku,
  name,
  packSize,
  rateB2b,
  category,
  imageUrl,
  enquireHref,
  variant = "card",
}: ProductCardActionsProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({ sku, name, packSize, rateB2b, category, imageUrl }, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  if (variant === "detail") {
    return (
      <div className="mt-6 space-y-4">
        <label className="block text-sm text-muted">
          Quantity (packets)
          <input
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 w-24 rounded-lg border border-neutral-200 bg-cream px-3 py-2 text-sm text-ink"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand hover:text-ink"
          >
            {added ? "Added to order" : "Add to order"}
          </button>
          <Link href={enquireHref} className="rounded-full bg-brand px-5 py-3 text-center text-sm font-semibold text-ink">
            Enquire now
          </Link>
          <Link
            href="/price-list"
            className="rounded-full border border-neutral-300 px-5 py-3 text-center text-sm font-semibold text-ink"
          >
            View price list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-auto space-y-3 pt-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs text-neutral-500">
          Qty
          <input
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            className="ml-2 w-14 rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm text-neutral-900"
          />
        </label>
        <button
          type="button"
          onClick={handleAdd}
          className="flex-1 rounded-lg bg-[#23262C] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#FE7733]"
        >
          {added ? "Added ✓" : "Add to order"}
        </button>
      </div>
      <Link
        href={enquireHref}
        className="block text-center text-xs font-semibold uppercase tracking-wide text-[#FE7733] transition hover:text-[#23262C]"
      >
        Enquire →
      </Link>
    </div>
  );
}
