import type { BatchSource, Prisma, StockMoveType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { round3 } from "@/lib/utils";

type Tx = Prisma.TransactionClient;

export type StockPick = { batchId: string; lotNo: string; qty: number };

export async function addStock(
  tx: Tx,
  input: {
    itemId: string;
    lotNo: string;
    mfgDate?: Date | null;
    expiryDate?: Date | null;
    qty: number;
    source: BatchSource;
    sourceId: string;
    moveType: StockMoveType;
    notes?: string;
  },
) {
  const qty = round3(input.qty);
  if (qty <= 0) throw new Error("Quantity must be greater than zero");

  let batch = await tx.batch.findUnique({
    where: { itemId_lotNo: { itemId: input.itemId, lotNo: input.lotNo } },
  });

  if (!batch) {
    batch = await tx.batch.create({
      data: {
        itemId: input.itemId,
        lotNo: input.lotNo,
        mfgDate: input.mfgDate ?? null,
        expiryDate: input.expiryDate ?? null,
        qtyOnHand: qty,
        source: input.source,
        sourceId: input.sourceId,
      },
    });
  } else {
    batch = await tx.batch.update({
      where: { id: batch.id },
      data: { qtyOnHand: { increment: qty } },
    });
  }

  await tx.stockMove.create({
    data: {
      itemId: input.itemId,
      batchId: batch.id,
      type: input.moveType,
      qty,
      refType: input.source,
      refId: input.sourceId,
      notes: input.notes ?? "",
    },
  });

  return batch;
}

export async function pickFefo(tx: Tx, itemId: string, qtyNeeded: number): Promise<StockPick[]> {
  const needed = round3(qtyNeeded);
  if (needed <= 0) throw new Error("Quantity must be greater than zero");

  const batches = await tx.batch.findMany({
    where: { itemId, qtyOnHand: { gt: 0 } },
    orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
  });

  let remaining = needed;
  const picks: StockPick[] = [];
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = round3(Math.min(batch.qtyOnHand, remaining));
    if (take <= 0) continue;
    picks.push({ batchId: batch.id, lotNo: batch.lotNo, qty: take });
    remaining = round3(remaining - take);
  }

  if (remaining > 0.0005) {
    const item = await tx.item.findUnique({ where: { id: itemId } });
    throw new Error(`Insufficient stock for ${item?.name ?? "item"} (short ${remaining})`);
  }
  return picks;
}

export async function consumeStock(
  tx: Tx,
  input: {
    itemId: string;
    qty: number;
    moveType: StockMoveType;
    refType: string;
    refId: string;
    notes?: string;
    wasteCause?: import("@prisma/client").WasteCause | null;
  },
) {
  const picks = await pickFefo(tx, input.itemId, input.qty);
  for (const pick of picks) {
    await tx.batch.update({
      where: { id: pick.batchId },
      data: { qtyOnHand: { decrement: pick.qty } },
    });
    await tx.stockMove.create({
      data: {
        itemId: input.itemId,
        batchId: pick.batchId,
        type: input.moveType,
        qty: -pick.qty,
        wasteCause: input.moveType === "WASTE" ? (input.wasteCause ?? "OTHER") : null,
        refType: input.refType,
        refId: input.refId,
        notes: input.notes ?? "",
      },
    });
  }
  return picks;
}

export async function getOnHand(itemId?: string) {
  const batches = await prisma.batch.groupBy({
    by: ["itemId"],
    where: itemId ? { itemId } : undefined,
    _sum: { qtyOnHand: true },
  });
  return Object.fromEntries(batches.map((b) => [b.itemId, b._sum.qtyOnHand ?? 0]));
}

export type StockHint = {
  onHand: number;
  nearestExpiry: string | null;
  lotNo: string | null;
  unit: string;
};

export async function getStockHints(): Promise<Record<string, StockHint>> {
  const batches = await prisma.batch.findMany({
    where: { qtyOnHand: { gt: 0 } },
    include: { item: true },
    orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
  });
  const map: Record<string, StockHint> = {};
  for (const b of batches) {
    const cur = map[b.itemId] ?? {
      onHand: 0,
      nearestExpiry: null,
      lotNo: null,
      unit: b.item.unit,
    };
    cur.onHand += b.qtyOnHand;
    if (!cur.nearestExpiry && b.expiryDate) {
      cur.nearestExpiry = b.expiryDate.toISOString();
      cur.lotNo = b.lotNo;
    }
    map[b.itemId] = cur;
  }
  return map;
}
