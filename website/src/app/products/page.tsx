import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { fetchProducts } from "@/lib/api";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Products",
  description: `Veg and non-veg frozen patties and nuggets from ${SITE_NAME}.`,
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const tab = (await searchParams).tab === "non-veg" ? "non-veg" : "veg";
  const products = await fetchProducts(tab);

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="font-display text-4xl text-neutral-900">Products</h1>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Frozen veg and non-veg lines for HORECA. Prices on the B2B price list page.
          </p>

          <div className="mt-8 flex gap-2">
            {(["veg", "non-veg"] as const).map((t) => (
              <a
                key={t}
                href={`/products?tab=${t}`}
                className={`rounded-full px-5 py-2 text-sm font-semibold capitalize transition ${
                  tab === t ? "bg-[#FE7733] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {t.replace("-", " ")}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14">
        {products.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-500">
            Catalog not synced yet. Publish from ERP Settings → Website sync.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.sku} product={p} showPrice />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
