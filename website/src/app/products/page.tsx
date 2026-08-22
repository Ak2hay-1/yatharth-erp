import type { Metadata } from "next";
import Image from "next/image";
import { assetUrl, fetchProducts } from "@/lib/api";
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
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="font-display text-4xl">Products</h1>
      <p className="mt-3 max-w-2xl text-white/75">Frozen veg and non-veg lines for HORECA. Prices on the B2B price list page.</p>

      <div className="mt-8 flex gap-2">
        {(["veg", "non-veg"] as const).map((t) => (
          <a
            key={t}
            href={`/products?tab=${t}`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${
              tab === t ? "bg-[#FE7733] text-[#23262C]" : "bg-[#3A3F47] text-white/80"
            }`}
          >
            {t.replace("-", " ")}
          </a>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-white/20 p-8 text-center text-white/60">
          Catalog not synced yet. Publish from ERP Settings → Website sync.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const img = p.assets?.[0]?.publicUrl;
            return (
              <article key={p.sku} className="overflow-hidden rounded-2xl bg-[#3A3F47]">
                <div className="relative aspect-[4/3] bg-[#23262C]">
                  {img ? (
                    <Image src={assetUrl(img)} alt={p.name} fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-white/30">Photo coming soon</div>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-wide text-[#B1FA63]">{p.category}</p>
                  <h2 className="mt-1 font-semibold">{p.name}</h2>
                  <p className="mt-2 text-sm text-white/60">{p.packSize || `${p.unitsPerPkt} pcs / packet`}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
