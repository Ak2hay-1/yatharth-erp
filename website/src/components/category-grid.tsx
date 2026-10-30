import Image from "next/image";
import Link from "next/link";
import { PRODUCT_CATEGORIES } from "@/lib/catalog";

export function CategoryGrid() {
  return (
    <section className="bg-cream py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Range</p>
            <h2 className="font-display mt-2 text-3xl text-ink md:text-4xl">Our product range</h2>
            <p className="mt-3 max-w-xl text-sm text-muted">
              Patties, nuggets and bulk packs made for restaurants and food businesses.
            </p>
          </div>
          <Link href="/products" className="hidden text-sm font-semibold text-brand hover:underline sm:block">
            View all products →
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCT_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={cat.href}
              className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] bg-neutral-100">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>
              <div className="p-4">
                <h3 className="text-base font-semibold text-ink">{cat.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{cat.description}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-brand">View →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
