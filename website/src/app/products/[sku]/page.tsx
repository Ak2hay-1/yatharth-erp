import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ProductCardActions } from "@/components/product-card-actions";
import { fetchProduct, fetchProducts, money } from "@/lib/api";
import { FROZEN_HANDLING, isVegProduct, packLabel, productImageSrc, productSummary } from "@/lib/product-media";
import { SITE_NAME } from "@/lib/site";

type PageProps = { params: Promise<{ sku: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sku } = await params;
  const product = await fetchProduct(sku);
  if (!product) return { title: "Product" };
  return {
    title: product.name,
    description: `${product.name} — frozen food from ${SITE_NAME}. ${packLabel(product)}.`,
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { sku } = await params;
  const product = await fetchProduct(sku);
  if (!product) notFound();

  const veg = isVegProduct(product.category);
  const img = productImageSrc(product);
  const label = packLabel(product);
  const enquireHref = `/contact?product=${encodeURIComponent(product.name)}`;
  const lane = product.category === "non-veg" ? "non-veg" : product.category === "veg" ? "veg" : undefined;
  const related = (await fetchProducts(lane)).filter((item) => item.sku !== product.sku).slice(0, 4);

  const specs = [
    ["Category", veg ? "Veg" : "Non-veg"],
    ["Pack", label],
    ["Units per packet", String(product.unitsPerPkt)],
    ["USP", product.usp > 0 ? money(product.usp) : "On request"],
    ["B2B rate", product.rateB2b > 0 ? money(product.rateB2b) : "On request"],
  ];

  return (
    <div className="min-h-full bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <p className="text-sm text-muted">
          <Link href="/" className="hover:text-brand">
            Home
          </Link>
          <span className="px-2">/</span>
          <Link href="/products" className="hover:text-brand">
            Products
          </Link>
          <span className="px-2">/</span>
          <span className="text-ink">{product.name}</span>
        </p>

        <div className="mt-6 grid items-start gap-10 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            <Image src={img} alt={product.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" priority />
          </div>

          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink ring-1 ring-black/5">
              <span className={`h-2.5 w-2.5 rounded-full ${veg ? "bg-veg" : "bg-[#b91c1c]"}`} aria-hidden />
              {veg ? "Veg" : "Non-veg"}
            </p>
            <h1 className="font-display mt-4 text-4xl text-ink md:text-5xl">{product.name}</h1>
            <p className="mt-4 max-w-xl text-muted leading-relaxed">{productSummary(product)}</p>

            <dl className="mt-6 divide-y divide-black/5 rounded-2xl bg-white ring-1 ring-black/5">
              {specs.map(([term, value]) => (
                <div key={term} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-muted">{term}</dt>
                  <dd className="font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">General frozen handling</h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                {FROZEN_HANDLING.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">These notes apply to the frozen range. They are not a lab spec for this SKU.</p>
            </div>

            <ProductCardActions
              variant="detail"
              sku={product.sku}
              name={product.name}
              packSize={label}
              rateB2b={product.rateB2b}
              category={product.category}
              imageUrl={product.assets?.[0]?.publicUrl ? img : undefined}
              enquireHref={enquireHref}
            />
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-16">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-3xl text-ink">More in this range</h2>
              <Link href="/products" className="text-sm font-semibold text-brand hover:underline">
                All products →
              </Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.sku} product={item} showPrice />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
