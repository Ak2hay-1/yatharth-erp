import Link from "next/link";
import { BRAND_TAGLINE } from "@/lib/brand";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B1FA63]">Frozen foods manufacturer</p>
            <h1 className="font-display mt-4 text-4xl leading-tight md:text-5xl">
              Quality patties & nuggets for{" "}
              <span className="text-[#FE7733]">restaurants & distributors</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              {BRAND_TAGLINE} — veg and non-veg burger patties, crispy variants, cheese nuggets and more. Made in
              Chinchwad, Pune with cold-chain dispatch.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="rounded-lg bg-[#FE7733] px-5 py-3 text-sm font-semibold text-[#23262C]">
                View products
              </Link>
              <Link
                href="/price-list"
                className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:border-[#B1FA63]"
              >
                B2B price list
              </Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Veg range", desc: "Aloo, veg & corn nuggets", tone: "#B1FA63" },
              { title: "Non-veg range", desc: "Chicken patties & nuggets", tone: "#FE7733" },
              { title: "HORECA packs", desc: "USP-based packet pricing", tone: "#ffffff" },
              { title: "Pune plant", desc: "PCMC Link Road, Chinchwad", tone: "#B1FA63" },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl bg-[#3A3F47] p-5">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: card.tone }}>
                  {card.title}
                </p>
                <p className="mt-2 text-sm text-white/80">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl">Why Yathartha?</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            ["Consistent quality", "Standard recipes, batch traceability and FEFO stock at our plant."],
            ["B2B-friendly packs", "Clear USP and per-packet rates for cafes, QSR and distributors."],
            ["Local support", "Based in Chinchwad — quick dispatch across Pune PCMC."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-[#3A3F47]/60 p-6">
              <h3 className="text-lg font-semibold text-[#FE7733]">{title}</h3>
              <p className="mt-2 text-sm text-white/75">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
