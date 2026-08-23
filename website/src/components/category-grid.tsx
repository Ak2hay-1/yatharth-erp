import Link from "next/link";
import { PRODUCT_CATEGORIES } from "@/lib/catalog";

export function CategoryGrid() {
  return (
    <section className="bg-neutral-50 py-14">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center font-display text-3xl text-neutral-900">Popular categories</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-neutral-600">
          Frozen burger patties, nuggets and HORECA packs — browse by category
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={cat.href}
              className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 transition group-hover:opacity-10`}
              />
              <span className="text-3xl" aria-hidden>
                {cat.emoji}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-neutral-900">{cat.title}</h3>
              <p className="mt-1 text-sm text-neutral-600">{cat.description}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-[#FE7733] group-hover:underline">
                Shop now →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
