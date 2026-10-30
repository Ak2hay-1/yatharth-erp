import Image from "next/image";
import Link from "next/link";
import { CategoryGrid } from "@/components/category-grid";
import { ProductCard } from "@/components/product-card";
import { fetchProducts } from "@/lib/api";
import { AUDIENCES, PARTNER_OFFERS, TRUST_POINTS, WHY_CHOOSE } from "@/lib/catalog";

export default async function HomePage() {
  const products = await fetchProducts();
  const featured = products.slice(0, 8);

  return (
    <div>
      <section className="relative min-h-[620px] overflow-hidden bg-ink text-white">
        <Image
          src="/marketing/hero-burger.jpg"
          alt="Sesame burger with cheese, tomato and fries"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/25" />
        <div className="relative mx-auto flex min-h-[620px] max-w-6xl flex-col justify-center px-4 py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">Made in Pune</p>
          <h1 className="font-display mt-4 max-w-xl text-4xl leading-[1.05] text-white md:text-6xl">
            Premium <span className="text-brand">frozen foods</span> for growing food businesses
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
            High quality patties, nuggets and ready-to-cook products for restaurants, hotels, cafes, QSR chains and
            distributors.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110"
            >
              Explore products
            </Link>
            <Link
              href="/price-list"
              className="rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Download e-catalog
            </Link>
          </div>
          <ul className="mt-12 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
            {TRUST_POINTS.map((point) => (
              <li key={point.title}>
                <p className="text-sm font-semibold text-white">{point.title}</p>
                <p className="mt-1 text-xs text-white/65">{point.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CategoryGrid />

      <section className="relative overflow-hidden bg-ink text-white">
        <Image
          src="/marketing/manufacturing-line.jpg"
          alt="Hygienic production line forming burger patties"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-ink/75" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Plant</p>
            <h2 className="font-display mt-2 text-3xl md:text-4xl">Our manufacturing</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75 md:text-base">
              Frozen patties and nuggets are made at our Chinchwad plant, with hygienic handling and cold-chain
              dispatch for food businesses.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {[
              ["Hygienic production", "Controlled preparation on the line"],
              ["FSSAI compliant", "Processes aligned to food safety rules"],
              ["Consistent taste", "Standard recipes, batch after batch"],
              ["Raw materials", "Selected for a stable finished product"],
            ].map(([title, body]) => (
              <li key={title} className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/70">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative overflow-hidden text-white">
        <Image
          src="/marketing/hero-burger.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#3a1c10]/90 via-ink/80 to-ink/70" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl md:text-5xl">Let&apos;s grow your food business together.</h2>
            <p className="mt-4 text-white/80">Looking for a reliable frozen food supply partner?</p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PARTNER_OFFERS.map((offer) => (
              <div key={offer.title} className="rounded-2xl border border-white/15 bg-ink/50 p-4 backdrop-blur-sm">
                <p className="font-semibold">{offer.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{offer.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact" className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-ink">
              Request a quote
            </Link>
            <Link
              href="/contact?intent=distributor"
              className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white"
            >
              Become a distributor
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-3xl text-ink md:text-4xl">Why choose Yathartha</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {WHY_CHOOSE.map((item) => (
              <div key={item.title} className="text-center lg:text-left">
                <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand/15 text-brand lg:mx-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-black/5 bg-cream py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-3xl text-ink">Trusted by food businesses</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted">
            Supplying restaurants, cafes, hotels, cloud kitchens and distributors across Pune and nearby regions.
          </p>
          <ul className="mt-8 flex flex-wrap justify-center gap-3">
            {AUDIENCES.map((name) => (
              <li key={name} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5">
                {name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl text-ink">From the catalog</h2>
              <p className="mt-2 text-sm text-muted">Live products published from the plant catalog.</p>
            </div>
            <Link href="/products" className="hidden text-sm font-semibold text-brand hover:underline sm:block">
              View all →
            </Link>
          </div>

          {featured.length === 0 ? (
            <p className="mt-10 rounded-xl border border-dashed border-neutral-300 bg-cream p-8 text-center text-muted">
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
    </div>
  );
}
