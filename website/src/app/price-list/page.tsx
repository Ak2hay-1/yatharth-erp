import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { fetchPriceList, money } from "@/lib/api";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "E-Catalog — B2B price list",
  description: `Current B2B packet rates for HORECA and distributors — ${SITE_NAME}.`,
};

const CATALOG_POINTS = [
  { title: "Complete product range", body: "Veg and non-veg patties and nuggets in one list." },
  { title: "Packaging information", body: "Units per packet next to each B2B rate." },
  { title: "Preparation", body: "Cook from frozen. Handling notes sit on each product page." },
  { title: "Restaurants and distributors", body: "Packet rates for HORECA outlets and bulk buyers." },
];

function PriceTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; usp: number; unitsPerPkt: number; rateB2b: number }>;
}) {
  if (!rows.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="bg-brand px-4 py-3 text-sm font-semibold text-ink">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">USP (Rs.)</th>
              <th className="px-4 py-3">Per PKT</th>
              <th className="px-4 py-3">B2B rate (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className={i % 2 ? "bg-cream/70" : "bg-white"}>
                <td className="px-4 py-3 text-ink">{r.name}</td>
                <td className="px-4 py-3 text-muted">{money(r.usp)}</td>
                <td className="px-4 py-3 text-muted">{r.unitsPerPkt}</td>
                <td className="px-4 py-3 font-semibold text-brand">{money(r.rateB2b)}</td>
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
    <div className="min-h-full bg-cream">
      <div className="border-b border-black/5 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-[1.3fr_0.7fr] md:py-14">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">E-catalog</p>
            <h1 className="font-display mt-2 text-4xl text-ink md:text-5xl">Download our e-catalog</h1>
            <p className="mt-3 max-w-2xl text-muted">
              Live B2B packet rates for distributors and HORECA. The list updates when the plant publishes from the ERP.
              Download PDF opens your browser print dialog so you can save this list.
            </p>
            {list?.updatedAt ? (
              <p className="mt-2 text-xs text-muted">Last updated: {new Date(list.updatedAt).toLocaleString("en-IN")}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <PrintButton
                label="Download PDF"
                className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60"
              />
              <Link
                href="/contact?intent=catalog"
                className="no-print rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold text-ink"
              >
                Request physical catalog
              </Link>
            </div>
          </div>
          <ul className="grid gap-3">
            {CATALOG_POINTS.map((point) => (
              <li key={point.title} className="rounded-2xl bg-cream px-4 py-3">
                <p className="text-sm font-semibold text-ink">{point.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{point.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14">
        {!list ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-muted">
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
