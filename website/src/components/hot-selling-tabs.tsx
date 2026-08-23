"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicProduct } from "@/lib/api";
import { ProductCard } from "@/components/product-card";

type HotSellingTabsProps = {
  veg: PublicProduct[];
  nonVeg: PublicProduct[];
};

export function HotSellingTabs({ veg, nonVeg }: HotSellingTabsProps) {
  const [tab, setTab] = useState<"veg" | "non-veg">("veg");
  const products = tab === "veg" ? veg : nonVeg;

  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center font-display text-3xl text-neutral-900">🔥 Hot selling products</h2>
        <div className="mt-8 flex justify-center gap-2">
          {(["veg", "non-veg"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2 text-sm font-semibold capitalize transition ${
                tab === t ? "bg-[#FE7733] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {t.replace("-", " ")}
            </button>
          ))}
        </div>
        {products.length === 0 ? (
          <p className="mt-10 text-center text-sm text-neutral-500">Catalog syncing — check back soon.</p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link href={`/products?tab=${tab}`} className="text-sm font-semibold text-[#FE7733] hover:underline">
            View all {tab.replace("-", " ")} products →
          </Link>
        </div>
      </div>
    </section>
  );
}
