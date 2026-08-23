import type { Metadata } from "next";
import { fetchCompany } from "@/lib/api";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${SITE_NAME} — frozen foods manufacturer in Chinchwad, Pune.`,
};

export default async function AboutPage() {
  const company = await fetchCompany();

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="font-display text-4xl text-neutral-900">About us</h1>
          <p className="mt-4 max-w-3xl text-lg text-neutral-600">
            {company?.name ?? "Yathartha Foods & Beverages"} manufactures frozen burger patties, nuggets and ready foods
            for hotels, restaurants, cafes and distributors. Our plant in Chinchwad, Pune focuses on consistent taste,
            hygienic production and reliable B2B supply.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
            <h2 className="text-lg font-semibold text-[#FE7733]">Our location</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-600">
              {company?.address ?? "Shop No. 29, Harshal Heights, PCMC Link Road, Gawade Nagar, Chinchwad"}
              {"\n"}
              {company?.city ?? "Pune"}, {company?.state ?? "Maharashtra"} — {company?.pincode ?? "411033"}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
            <h2 className="text-lg font-semibold text-[#FE7733]">Compliance</h2>
            <dl className="mt-3 space-y-2 text-sm text-neutral-600">
              <div className="flex justify-between gap-4 border-b border-neutral-100 pb-2">
                <dt className="text-neutral-400">FSSAI</dt>
                <dd>{company?.fssai ?? "On request"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-neutral-100 pb-2">
                <dt className="text-neutral-400">GSTIN</dt>
                <dd>{company?.gstin ?? "On request"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-400">Phone</dt>
                <dd>{company?.phone ?? "7028832038"}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-[#23262C] p-8 text-white">
          <h2 className="font-display text-2xl">What we manufacture</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-white/80">
            <li>• Veg burger patties (aloo, corn & mixed veg)</li>
            <li>• Non-veg chicken patties & crispy variants</li>
            <li>• Veg & cheese nuggets for QSR</li>
            <li>• HORECA bulk packs with USP-based pricing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
