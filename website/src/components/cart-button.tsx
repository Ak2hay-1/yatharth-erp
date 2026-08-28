"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartButton({ className = "" }: { className?: string }) {
  const { itemCount, hydrated } = useCart();

  return (
    <Link
      href="/order"
      aria-label={`View order${itemCount > 0 ? ` (${itemCount} items)` : ""}`}
      className={`relative inline-flex items-center justify-center rounded-lg p-2 text-white/85 transition hover:bg-white/10 hover:text-white ${className}`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 6h15l-1.5 9h-12L6 6z" />
        <path d="M6 6L5 3H2" />
        <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
      </svg>
      {hydrated && itemCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FE7733] px-1 text-[10px] font-bold text-[#23262C]">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </Link>
  );
}
