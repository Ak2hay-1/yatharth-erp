import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { fetchProducts, type PublicProduct } from "@/lib/api";
import { PRODUCT_TABS, type ProductTab } from "@/lib/catalog";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Products",
  description: `Veg and non-veg frozen patties and nuggets from ${SITE_NAME}.`,
};

function isTab(value: string | undefined): value is ProductTab {
  return PRODUCT_TABS.some((tab) => tab.id === value);
}

function filterProducts(products: PublicProduct[], tab: ProductTab, query: string) {
  let list = products;
  if (tab === "nuggets") list = list.filter((p) => /nugget/i.test(p.name));
  if (tab === "packs") {
    list = list.filter((p) => /pack|bulk|horeca|carton/i.test(`${p.name} ${p.packSize}`));
  }
  const needle = query.trim().toLowerCase();
  if (needle) {
    list = list.filter((p) => p.name.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle));
  }
  return list;
}

function listingHref(tab: ProductTab, query: string) {
  const params = new URLSearchParams();
  if (tab !== "all") params.set("tab", tab);
  if (query) params.set("q", query);
  const search = params.toString();
  return search ? `/products?${search}` : "/products";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const params = await searchParams;
  const tab: ProductTab = isTab(params.tab) ? params.tab : "all";
  const query = (params.q ?? "").trim();
  const category = tab === "veg" || tab === "non-veg" ? tab : undefined;
  const products = filterProducts(await fetchProducts(category), tab, query);

  return (
    <div className="min-h-full bg-cream">
      <div className="border-b border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Catalog</p>
          <h1 className="font-display mt-2 text-4xl text-ink md:text-5xl">Products</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Frozen veg and non-veg lines for restaurants, hotels, cafes and distributors. Open a product for pack
            details, or send an enquiry.
          </p>
          {query ? (
            <p className="mt-4 text-sm text-ink">
              Results for <span className="font-semibold">&ldquo;{query}&rdquo;</span>
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-2">
            {PRODUCT_TABS.map((item) => (
              <Link
                key={item.id}
                href={listingHref(item.id, query)}
                aria-current={tab === item.id ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab === item.id ? "bg-brand text-ink" : "bg-cream text-muted hover:bg-neutral-200"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12">
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-muted">
            {tab === "packs" ? (
              <p>
                No pack-labelled products in the live catalog yet.{" "}
                <Link href="/price-list" className="font-semibold text-brand hover:underline">
                  See HORECA rates in the e-catalog
                </Link>
                .
              </p>
            ) : query || tab !== "all" ? (
              <p>No products match this filter. Try another category or clear the search.</p>
            ) : (
              <p>Catalog not synced yet. Publish from ERP Settings → Website sync.</p>
            )}
          </div>
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
