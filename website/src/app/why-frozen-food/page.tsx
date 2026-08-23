import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Why buy frozen food",
  description: `Benefits of frozen foods for HORECA — quality, convenience and cost savings from ${SITE_NAME}.`,
};

export default function WhyFrozenFoodPage() {
  return (
    <div className="bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="font-display text-4xl text-neutral-900">Why buy frozen food?</h1>
          <p className="mt-4 max-w-3xl text-lg text-neutral-600">
            For restaurants, cafes and food service businesses, frozen foods offer consistency, reduced waste and
            faster kitchen operations — without compromising on taste or hygiene.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-8 md:grid-cols-2">
          {[
            {
              title: "Consistent quality every batch",
              body: "Standard recipes and controlled freezing lock in taste and texture. Your customers get the same experience whether it is Monday rush or weekend peak.",
            },
            {
              title: "Reduced kitchen prep time",
              body: "Pre-portioned patties and nuggets go straight from freezer to grill or fryer. Less chopping, less staffing pressure during service hours.",
            },
            {
              title: "Lower food waste",
              body: "Use only what you need and keep the rest frozen. Longer shelf life means fewer spoilage losses compared to fresh-only inventory.",
            },
            {
              title: "Better cost control",
              body: "Predictable USP-based pricing helps you plan margins. Bulk HORECA packs are designed for high-volume outlets and distributors.",
            },
            {
              title: "Hygiene & safety",
              body: "Flash freezing at the plant preserves freshness and limits bacterial growth. Our Chinchwad facility follows FSSAI-compliant processes.",
            },
            {
              title: "Year-round availability",
              body: "No seasonal gaps — veg and non-veg lines are available throughout the year with reliable cold-chain dispatch from Pune.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
              <h2 className="text-lg font-semibold text-[#FE7733]">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-[#23262C] p-8 text-center text-white md:p-12">
          <h2 className="font-display text-2xl">Ready to switch to frozen?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Browse our product range or request samples for your kitchen.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/products" className="rounded-lg bg-[#FE7733] px-5 py-3 text-sm font-semibold text-[#23262C]">
              View products
            </Link>
            <Link
              href="/contact"
              className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:border-[#B1FA63]"
            >
              Request samples
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
