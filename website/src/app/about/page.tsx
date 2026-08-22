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
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="font-display text-4xl">About us</h1>
      <p className="mt-4 max-w-3xl text-lg text-white/75">
        {company?.name ?? "Yathartha Foods & Beverages"} manufactures frozen burger patties, nuggets and ready foods for
        hotels, restaurants, cafes and distributors. Our plant in Chinchwad, Pune focuses on consistent taste, hygienic
        production and reliable B2B supply.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-[#3A3F47] p-6">
          <h2 className="text-lg font-semibold text-[#B1FA63]">Our location</h2>
          <p className="mt-3 text-sm text-white/80 whitespace-pre-line">
            {company?.address ?? "Shop No. 29, Harshal Heights, PCMC Link Road, Gawade Nagar, Chinchwad"}
            {"\n"}
            {company?.city ?? "Pune"}, {company?.state ?? "Maharashtra"} — {company?.pincode ?? "411033"}
          </p>
        </div>
        <div className="rounded-2xl bg-[#3A3F47] p-6">
          <h2 className="text-lg font-semibold text-[#B1FA63]">Compliance</h2>
          <dl className="mt-3 space-y-2 text-sm text-white/80">
            <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
              <dt className="text-white/50">FSSAI</dt>
              <dd>{company?.fssai ?? "On request"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
              <dt className="text-white/50">GSTIN</dt>
              <dd>{company?.gstin ?? "On request"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/50">Phone</dt>
              <dd>{company?.phone ?? "7028832038"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
