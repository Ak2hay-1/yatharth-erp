import type { Metadata } from "next";
import { fetchPriceList, money } from "@/lib/api";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "B2B price list",
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
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="bg-[#FE7733] px-4 py-3 text-sm font-semibold text-[#23262C]">{title}</div>
      <table className="w-full text-sm">
        <thead className="bg-[#3A3F47] text-left text-xs uppercase tracking-wide text-white/60">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">USP (Rs.)</th>
            <th className="px-4 py-3">Per PKT</th>
            <th className="px-4 py-3">B2B rate (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} className={i % 2 ? "bg-[#3A3F47]/40" : "bg-[#23262C]/40"}>
              <td className="px-4 py-3">{r.name}</td>
              <td className="px-4 py-3">{money(r.usp)}</td>
              <td className="px-4 py-3">{r.unitsPerPkt}</td>
              <td className="px-4 py-3 font-semibold text-[#B1FA63]">{money(r.rateB2b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PriceListPage() {
  const list = await fetchPriceList();

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="font-display text-4xl">B2B price list</h1>
      <p className="mt-3 max-w-2xl text-white/75">
        Frozen foods — packet rates for distributors and HORECA. Updated from our ERP when you publish from the plant office.
      </p>
      {list?.updatedAt ? (
        <p className="mt-2 text-xs text-white/40">Last updated: {new Date(list.updatedAt).toLocaleString("en-IN")}</p>
      ) : null}

      {!list ? (
        <p className="mt-10 rounded-xl border border-dashed border-white/20 p-8 text-center text-white/60">
          Price list not available yet. Configure sync in ERP and click Publish to website.
        </p>
      ) : (
        <div className="mt-10 space-y-8">
          <PriceTable title="Veg products" rows={list.veg} />
          <PriceTable title="Non-veg products" rows={list.nonVeg} />
        </div>
      )}
    </div>
  );
}
