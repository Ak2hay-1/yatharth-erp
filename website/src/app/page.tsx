import Link from "next/link";
import { CategoryGrid } from "@/components/category-grid";
import { HeroCarousel } from "@/components/hero-carousel";
import { HotSellingTabs } from "@/components/hot-selling-tabs";
import { ProductCard } from "@/components/product-card";
import { fetchProducts } from "@/lib/api";
import { BRAND_TAGLINE } from "@/lib/brand";

export default async function HomePage() {
  const [vegProducts, nonVegProducts] = await Promise.all([fetchProducts("veg"), fetchProducts("non-veg")]);
  const featured = [...vegProducts, ...nonVegProducts].slice(0, 8);

  return (
    <div>
      <HeroCarousel />
      <CategoryGrid />

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl text-neutral-900">Featured collection</h2>
              <p className="mt-2 text-sm text-neutral-600">Top frozen foods for restaurants and distributors</p>
            </div>
            <Link href="/products" className="hidden text-sm font-semibold text-[#FE7733] hover:underline sm:block">
              View all →
            </Link>
          </div>

          {featured.length === 0 ? (
            <p className="mt-10 rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
              Catalog not synced yet. Publish from ERP Settings → Website sync.
            </p>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.sku} product={p} showPrice />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-0 md:grid-cols-2">
        <div className="relative flex min-h-[220px] items-center bg-gradient-to-br from-[#FE7733] to-[#23262C] px-8 py-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-white/80">Cold-chain logistics</p>
            <h3 className="font-display mt-2 text-2xl text-white">Reliable dispatch from Pune</h3>
            <p className="mt-2 max-w-sm text-sm text-white/75">
              FEFO stock management and batch traceability at our Chinchwad plant.
            </p>
          </div>
        </div>
        <div className="relative flex min-h-[220px] items-center bg-gradient-to-br from-[#23262C] to-[#3A3F47] px-8 py-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#B1FA63]">B2B pricing</p>
            <h3 className="font-display mt-2 text-2xl text-white">Clear USP & packet rates</h3>
            <p className="mt-2 max-w-sm text-sm text-white/75">
              Download the latest price list for cafes, QSR chains and distributors.
            </p>
            <Link href="/price-list" className="mt-4 inline-block text-sm font-semibold text-[#FE7733] hover:underline">
              View E-Catalog →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-neutral-50 py-14">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="font-display text-3xl text-neutral-900">
            Leading frozen food manufacturer in Pune
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-neutral-600 leading-relaxed">
            <strong className="text-neutral-900">Yathartha {BRAND_TAGLINE}</strong> manufactures premium frozen burger
            patties, nuggets and ready foods for hotels, restaurants, cafes and distributors. Based in Chinchwad, Pune,
            we focus on consistent taste, hygienic production and reliable B2B supply with cold-chain dispatch across
            Maharashtra.
          </p>
          <Link
            href="/about"
            className="mt-6 inline-block rounded-lg border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-800 transition hover:border-[#FE7733] hover:text-[#FE7733]"
          >
            Learn more about us
          </Link>
        </div>
      </section>

      <HotSellingTabs veg={vegProducts} nonVeg={nonVegProducts} />

      <section className="bg-[#23262C] py-14">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="font-display text-3xl text-white">Ready to partner with us?</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Enquire for HORECA supply, distribution partnerships or product samples.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="rounded-lg bg-[#FE7733] px-6 py-3 text-sm font-semibold text-[#23262C] transition hover:brightness-110"
            >
              Contact us
            </Link>
            <Link
              href="/price-list"
              className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#B1FA63]"
            >
              B2B price list
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
