import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PrintButton } from "@/components/print-button";

export default async function PrintLabelPage({ params }: { params: Promise<{ itemId: string }> }) {
  await requireUser();
  const { itemId } = await params;
  const [company, item] = await Promise.all([
    prisma.company.findUnique({ where: { id: "default" } }),
    prisma.item.findUnique({
      where: { id: itemId },
      include: { label: { include: { ingredientLines: { orderBy: { sortOrder: "asc" } } } } },
    }),
  ]);
  if (!company || !item?.label) notFound();
  const label = item.label;

  const nutrRows: [string, number, number][] = [
    ["Energy (kcal)", label.energyKcal100, label.energyKcalServe],
    ["Energy (kJ)", label.energyKj100, label.energyKjServe],
    ["Protein (g)", label.protein100, label.proteinServe],
    ["Carbohydrate (g)", label.carb100, label.carbServe],
    ["  of which sugars (g)", label.sugars100, label.sugarsServe],
    ["Fat (g)", label.fat100, label.fatServe],
    ["  Saturated fat (g)", label.satFat100, label.satFatServe],
    ["  Trans fat (g)", label.transFat100, label.transFatServe],
    ["Fibre (g)", label.fibre100, label.fibreServe],
    ["Sodium (mg)", label.sodium100, label.sodiumServe],
  ];

  return (
    <div className="print-sheet mx-auto max-w-2xl p-8 text-sm text-ink">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton label="Print / Save as PDF" />
      </div>
      <div className="border-2 border-ink p-5">
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-ink pb-3">
          <div>
            <div className="font-display text-2xl">{item.name}</div>
            <div className="font-mono text-xs text-muted">{item.sku}</div>
            {label.netQuantity ? <div className="mt-1">Net qty: {label.netQuantity}</div> : null}
          </div>
          <div className="text-right text-xs">
            <div className="font-semibold">{company.name}</div>
            <div>FSSAI: {company.fssai}</div>
            {label.vegNonVeg === "VEG" ? (
              <div className="mt-2 inline-block border-2 border-green-700 px-2 py-1 text-green-800">VEG</div>
            ) : label.vegNonVeg === "NON_VEG" ? (
              <div className="mt-2 inline-block border-2 border-red-700 px-2 py-1 text-red-800">NON-VEG</div>
            ) : null}
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide">Ingredients</div>
          <p>{label.ingredientStatement || "—"}</p>
          {label.allergens ? <p className="mt-2 font-semibold">Allergens: {label.allergens}</p> : null}
          {label.containsMayContain ? <p>May contain: {label.containsMayContain}</p> : null}
          {label.claims ? <p className="mt-1 italic">{label.claims}</p> : null}
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide">Nutrition information</div>
          <p className="mb-2 text-xs text-muted">
            Serving size: {label.servingSize || "—"} · Servings per pack: {label.servingsPerPack || "—"}
          </p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border border-ink bg-bg">
                <th className="border border-ink px-2 py-1 text-left">Nutrient</th>
                <th className="border border-ink px-2 py-1 text-right">Per 100 g</th>
                <th className="border border-ink px-2 py-1 text-right">Per serve</th>
              </tr>
            </thead>
            <tbody>
              {nutrRows.map(([name, a, b]) => (
                <tr key={name}>
                  <td className="border border-ink px-2 py-1">{name}</td>
                  <td className="border border-ink px-2 py-1 text-right">{a}</td>
                  <td className="border border-ink px-2 py-1 text-right">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
