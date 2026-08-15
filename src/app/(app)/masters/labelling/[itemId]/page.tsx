import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { Card, PageHeader, LinkButton } from "@/components/ui";
import { LabelEditor } from "@/components/label-editor";
import { saveItemLabel } from "@/server/labelling";

export default async function LabellingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireRole(MANAGEMENT);
  const { itemId } = await params;
  const saved = (await searchParams).saved;
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { label: { include: { ingredientLines: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!item || item.type !== "FINISHED") notFound();
  const label = item.label;
  if (!label) notFound();

  return (
    <div>
      <PageHeader
        title={item.name}
        subtitle={`${item.sku} · Pack labelling`}
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/print/label/${item.id}`} variant="secondary">
              Print preview
            </LinkButton>
            <LinkButton href="/masters/labelling" variant="secondary">
              Back
            </LinkButton>
          </div>
        }
      />
      {saved ? <p className="mb-4 text-sm text-ok">Saved.</p> : null}
      <Card className="p-6">
        <LabelEditor
          action={saveItemLabel.bind(null, item.id)}
          defaults={{
            ingredientStatement: label.ingredientStatement,
            allergens: label.allergens,
            containsMayContain: label.containsMayContain,
            claims: label.claims,
            netQuantity: label.netQuantity,
            vegNonVeg: label.vegNonVeg,
            servingSize: label.servingSize,
            servingsPerPack: label.servingsPerPack,
            energyKcal100: label.energyKcal100,
            energyKj100: label.energyKj100,
            protein100: label.protein100,
            carb100: label.carb100,
            sugars100: label.sugars100,
            fat100: label.fat100,
            satFat100: label.satFat100,
            transFat100: label.transFat100,
            fibre100: label.fibre100,
            sodium100: label.sodium100,
            energyKcalServe: label.energyKcalServe,
            energyKjServe: label.energyKjServe,
            proteinServe: label.proteinServe,
            carbServe: label.carbServe,
            sugarsServe: label.sugarsServe,
            fatServe: label.fatServe,
            satFatServe: label.satFatServe,
            transFatServe: label.transFatServe,
            fibreServe: label.fibreServe,
            sodiumServe: label.sodiumServe,
            ingredientLines: label.ingredientLines,
          }}
        />
      </Card>
    </div>
  );
}
