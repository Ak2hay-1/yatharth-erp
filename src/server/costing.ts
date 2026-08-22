import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient | typeof prisma;

export async function recipeUnitCost(tx: Tx, recipeId: string) {
  const recipe = await tx.recipe.findUnique({
    where: { id: recipeId },
    include: { lines: { include: { item: true } } },
  });
  if (!recipe || recipe.outputQty <= 0) return 0;
  const total = recipe.lines.reduce((s, l) => s + l.qty * l.item.purchasePrice, 0);
  return total / recipe.outputQty;
}

export async function productionBatchCost(
  tx: Tx,
  recipe: { outputQty: number; lines: { itemId: string; qty: number; item: { purchasePrice: number } }[] },
  outputQty: number,
  wastageQty: number,
) {
  if (recipe.outputQty <= 0) return { totalCost: 0, unitCost: 0 };
  const scale = (outputQty + wastageQty) / recipe.outputQty;
  const totalCost = recipe.lines.reduce((s, l) => s + l.qty * scale * l.item.purchasePrice, 0);
  const unitCost = outputQty > 0 ? totalCost / outputQty : 0;
  return { totalCost, unitCost };
}

export async function itemUnitCost(tx: Tx, itemId: string) {
  const latest = await tx.productionBatch.findFirst({
    where: {
      status: { not: "CANCELLED" },
      unitCost: { gt: 0 },
      workOrder: { recipe: { finishedItemId: itemId } },
    },
    orderBy: { mfgDate: "desc" },
  });
  if (latest) return latest.unitCost;

  const recipe = await tx.recipe.findUnique({ where: { finishedItemId: itemId } });
  if (recipe) return recipeUnitCost(tx, recipe.id);

  const item = await tx.item.findUnique({ where: { id: itemId } });
  return item?.purchasePrice ?? 0;
}

export async function contributionForLines(
  tx: Tx,
  lines: { itemId: string; qty: number; taxable: number }[],
) {
  let cost = 0;
  const byItem = new Map<string, number>();
  for (const line of lines) {
    let unit = byItem.get(line.itemId);
    if (unit === undefined) {
      unit = await itemUnitCost(tx, line.itemId);
      byItem.set(line.itemId, unit);
    }
    cost += line.qty * unit;
  }
  const revenue = lines.reduce((s, l) => s + l.taxable, 0);
  const contribution = revenue - cost;
  const pct = revenue > 0 ? (contribution / revenue) * 100 : 0;
  return { revenue, cost, contribution, pct };
}

export type MarkupPcts = {
  b2b: number;
  wholesale: number;
  distributor: number;
  mrp: number;
};

export function suggestedRate(mfgCost: number, markupPct: number) {
  return Math.round(mfgCost * (1 + markupPct / 100) * 100) / 100;
}

export function resolveMarkups(
  company: { markupB2bPct: number; markupWholesalePct: number; markupDistributorPct: number; markupMrpPct: number },
  item: {
    overrideB2bPct: number | null;
    overrideWholesalePct: number | null;
    overrideDistributorPct: number | null;
    overrideMrpPct: number | null;
  },
): MarkupPcts {
  return {
    b2b: item.overrideB2bPct ?? company.markupB2bPct,
    wholesale: item.overrideWholesalePct ?? company.markupWholesalePct,
    distributor: item.overrideDistributorPct ?? company.markupDistributorPct,
    mrp: item.overrideMrpPct ?? company.markupMrpPct,
  };
}

export function ratesFromMfg(mfgCost: number, markups: MarkupPcts) {
  return {
    rateB2b: suggestedRate(mfgCost, markups.b2b),
    rateWholesale: suggestedRate(mfgCost, markups.wholesale),
    rateDistributor: suggestedRate(mfgCost, markups.distributor),
    rateMrp: suggestedRate(mfgCost, markups.mrp),
    usp: suggestedRate(mfgCost, markups.b2b),
  };
}

export async function getCompanyMarkups() {
  const company = await prisma.company.findUnique({ where: { id: "default" } });
  return {
    markupB2bPct: company?.markupB2bPct ?? 20,
    markupWholesalePct: company?.markupWholesalePct ?? 25,
    markupDistributorPct: company?.markupDistributorPct ?? 35,
    markupMrpPct: company?.markupMrpPct ?? 50,
  };
}
