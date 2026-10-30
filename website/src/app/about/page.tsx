import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { fetchCompany } from "@/lib/api";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${SITE_NAME} — frozen foods manufacturer in Chinchwad, Pune.`,
};

const PILLARS = [
  {
    title: "Quality production",
    body: "Burger patties, nuggets and ready foods made to a standard recipe so outlets get the same result.",
  },
  {
    title: "Hygienic facility",
    body: "Production at our Chinchwad plant follows FSSAI-compliant processes.",
  },
  {
    title: "Skilled team",
    body: "A plant team focused on consistent batches, packing and cold-chain dispatch.",
  },
  {
    title: "Growing partnerships",
    body: "Supply for restaurants, cafes, hotels, QSR chains and distributors.",
  },
];

export default async function AboutPage() {
  const company = await fetchCompany();
  const name = company?.name ?? "Yathartha Foods & Beverages";
  const address = [
    company?.address ?? "Shop No. 29, Harshal Heights, PCMC Link Road, Gawade Nagar, Chinchwad",
    `${company?.city ?? "Pune"}, ${company?.state ?? "Maharashtra"} — ${company?.pincode ?? "411033"}`,
  ].join("\n");

  return (
    <div className="min-h-full bg-cream">
      <div className="border-b border-black/5 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Our story</p>
            <h1 className="font-display mt-3 text-4xl text-ink md:text-5xl">About {name}</h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              {name} manufactures frozen burger patties, nuggets and ready foods for hotels, restaurants, cafes and
              distributors. Our plant in Chinchwad, Pune focuses on consistent taste, hygienic production and reliable
              B2B supply.
            </p>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-ink shadow-sm">
            <Image
              src="/marketing/about-plant.jpg"
              alt="Yathartha Foods plant exterior"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((item) => (
            <div key={item.title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand/15">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-ink">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-brand">Our location</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{address}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-brand">Compliance</h2>
            <dl className="mt-3 space-y-2 text-sm text-muted">
              <div className="flex justify-between gap-4 border-b border-black/5 pb-2">
                <dt>FSSAI</dt>
                <dd className="font-medium text-ink">{company?.fssai || "On request"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-black/5 pb-2">
                <dt>GSTIN</dt>
                <dd className="font-medium text-ink">{company?.gstin || "On request"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Phone</dt>
                <dd className="font-medium text-ink">{company?.phone || "7028832038"}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-8 rounded-3xl bg-ink p-8 text-white md:p-10">
          <h2 className="font-display text-2xl">What we manufacture</h2>
          <ul className="mt-4 grid gap-3 text-sm text-white/80 sm:grid-cols-2">
            <li>Veg burger patties — aloo, corn and mixed veg</li>
            <li>Non-veg chicken patties and crispy variants</li>
            <li>Veg and cheese nuggets for QSR</li>
            <li>HORECA bulk packs with packet pricing</li>
          </ul>
          <Link href="/contact" className="mt-6 inline-block rounded-full bg-brand px-5 py-3 text-sm font-semibold text-ink">
            Talk to us
          </Link>
        </div>
      </div>
    </div>
  );
}
