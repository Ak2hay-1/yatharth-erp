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
};

export function ProductCardActions({
  sku,
  name,
  packSize,
  rateB2b,
  category,
  imageUrl,
  enquireHref,
}: ProductCardActionsProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({ sku, name, packSize, rateB2b, category, imageUrl }, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
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
