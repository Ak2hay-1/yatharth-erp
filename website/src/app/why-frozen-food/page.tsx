import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Why buy frozen food",
  description: `Benefits of frozen foods for HORECA — quality, convenience and cost savings from ${SITE_NAME}.`,
};

const BENEFITS = [
  {
    title: "Saves preparation time",
    body: "Pre-portioned patties and nuggets go from freezer to grill or fryer. Less chopping, and less staffing pressure during service.",
  },
  {
    title: "Consistent quality",
    body: "Standard recipes and controlled freezing lock in taste and texture, on a Monday rush or a weekend peak.",
  },
  {
    title: "Reduces food waste",
    body: "Use what you need and keep the rest frozen. Longer shelf life means fewer spoilage losses than a fresh-only inventory.",
  },
  {
    title: "Cost effective",
    body: "Predictable packet pricing helps you plan margins. Bulk HORECA packs are built for high-volume outlets and distributors.",
  },
];

const MORE = [
  {
    title: "Hygiene and safety",
    body: "Freezing at the plant preserves freshness and limits bacterial growth. Our Chinchwad facility follows FSSAI-compliant processes.",
  },
  {
    title: "Year-round availability",
    body: "Veg and non-veg lines stay available through the year, with cold-chain dispatch from Pune.",
  },
];

export default function WhyFrozenFoodPage() {
  return (
    <div className="min-h-full bg-cream">
      <div className="border-b border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">For kitchens</p>
          <h1 className="font-display mt-3 text-4xl text-ink md:text-5xl">Why choose frozen food?</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted">
            For restaurants, cafes and food service businesses, frozen foods offer consistency, less waste and faster
            kitchen operations — without giving up taste or hygiene.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-5 md:grid-cols-2">
          {BENEFITS.map((item) => (
            <article key={item.title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand/15">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-ink">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {MORE.map((item) => (
            <article key={item.title} className="rounded-2xl border border-black/5 bg-white/70 p-6">
              <h2 className="text-base font-semibold text-ink">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-3xl bg-ink p-8 text-center text-white md:p-12">
          <h2 className="font-display text-3xl">Ready to switch to frozen?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">Browse the range or ask for samples for your kitchen.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/products" className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-ink">
              View products
            </Link>
            <Link href="/contact" className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white">
              Request samples
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
