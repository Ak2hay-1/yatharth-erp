import type { Metadata } from "next";
import { fetchPriceList, money } from "@/lib/api";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "E-Catalog — B2B price list",
  description: `Current B2B packet rates for HORECA and distributors — ${SITE_NAME}.`,
};

function PriceTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; usp: number; unitsPerPkt: number; rateB2b: number }>;
}) {
  if (!rows.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="bg-[#FE7733] px-4 py-3 text-sm font-semibold text-white">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">USP (Rs.)</th>
              <th className="px-4 py-3">Per PKT</th>
              <th className="px-4 py-3">B2B rate (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className={i % 2 ? "bg-neutral-50/80" : "bg-white"}>
                <td className="px-4 py-3 text-neutral-800">{r.name}</td>
                <td className="px-4 py-3 text-neutral-600">{money(r.usp)}</td>
                <td className="px-4 py-3 text-neutral-600">{r.unitsPerPkt}</td>
                <td className="px-4 py-3 font-semibold text-[#FE7733]">{money(r.rateB2b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function PriceListPage() {
  const list = await fetchPriceList();

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="font-display text-4xl text-neutral-900">E-Catalog — B2B price list</h1>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Frozen foods — packet rates for distributors and HORECA. Updated from our ERP when you publish from the
            plant office.
          </p>
          {list?.updatedAt ? (
            <p className="mt-2 text-xs text-neutral-400">
              Last updated: {new Date(list.updatedAt).toLocaleString("en-IN")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14">
        {!list ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-500">
            Price list not available yet. Configure sync in ERP and click Publish to website.
          </p>
        ) : (
          <div className="space-y-8">
            <PriceTable title="Veg products" rows={list.veg} />
            <PriceTable title="Non-veg products" rows={list.nonVeg} />
          </div>
        )}
      </div>
    </div>
  );
}
