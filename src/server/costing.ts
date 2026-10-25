import { Prisma } from "@prisma/client";
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
  const map = await itemUnitCostMap(tx, [itemId]);
  return map.get(itemId) ?? 0;
}

/** One query pass for many finished SKUs. Later batches do not replace an earlier unit cost. */
export async function itemUnitCostMap(tx: Tx, itemIds: string[]) {
  const map = new Map<string, number>();
  if (!itemIds.length) return map;
  const latest = await tx.$queryRaw<{ itemId: string; unitCost: number }[]>`
    SELECT DISTINCT ON (r."finishedItemId")
      r."finishedItemId" AS "itemId",
      pb."unitCost" AS "unitCost"
    FROM "ProductionBatch" pb
    JOIN "WorkOrder" wo ON wo.id = pb."workOrderId"
    JOIN "Recipe" r ON r.id = wo."recipeId"
    WHERE pb.status <> 'CANCELLED'::"DocStatus"
      AND pb."unitCost" > 0
      AND r."finishedItemId" IN (${Prisma.join(itemIds)})
    ORDER BY r."finishedItemId", pb."mfgDate" DESC, pb."createdAt" DESC
  `;
  for (const row of latest) {
    if (!map.has(row.itemId)) map.set(row.itemId, Number(row.unitCost));
  }
  const missing = itemIds.filter((id) => !map.has(id));
  if (missing.length) {
    const recipes = await tx.recipe.findMany({
      where: { finishedItemId: { in: missing } },
      select: {
        finishedItemId: true,
        outputQty: true,
        lines: { select: { qty: true, item: { select: { purchasePrice: true } } } },
      },
    });
    for (const recipe of recipes) {
      if (recipe.outputQty <= 0) {
        map.set(recipe.finishedItemId, 0);
        continue;
      }
      const total = recipe.lines.reduce((s, l) => s + l.qty * l.item.purchasePrice, 0);
      map.set(recipe.finishedItemId, total / recipe.outputQty);
    }
  }
  const still = itemIds.filter((id) => !map.has(id));
  if (still.length) {
    const items = await tx.item.findMany({ where: { id: { in: still } }, select: { id: true, purchasePrice: true } });
    for (const item of items) map.set(item.id, item.purchasePrice ?? 0);
  }
  return map;
}

export async function contributionForLines(
  tx: Tx,
  lines: { itemId: string; qty: number; taxable: number }[],
) {
  const costs = await itemUnitCostMap(tx, [...new Set(lines.map((l) => l.itemId))]);
  let cost = 0;
  for (const line of lines) {
    cost += line.qty * (costs.get(line.itemId) ?? 0);
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

export function shownCosting(
  item: {
    mfgCost: number;
    usp: number;
    rateB2b: number;
    rateWholesale: number;
    rateDistributor: number;
    rateMrp: number;
    mfgCostSource: string;
    mfgCostUpdatedAt: Date | null;
    overrideB2bPct: number | null;
    overrideWholesalePct: number | null;
    overrideDistributorPct: number | null;
    overrideMrpPct: number | null;
  },
  computedMfg: number,
  company: { markupB2bPct: number; markupWholesalePct: number; markupDistributorPct: number; markupMrpPct: number },
) {
  const saved = item.mfgCostUpdatedAt != null || item.mfgCostSource !== "NONE";
  const mfgCost = saved ? item.mfgCost : computedMfg;
  const suggested = ratesFromMfg(mfgCost, resolveMarkups(company, item));
  const rates = saved
    ? {
        usp: item.usp,
        rateB2b: item.rateB2b,
        rateWholesale: item.rateWholesale,
        rateDistributor: item.rateDistributor,
        rateMrp: item.rateMrp,
      }
    : suggested;
  return {
    mfgCost,
    ...rates,
    missingPurchasePrices: mfgCost <= 0 && computedMfg <= 0,
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
