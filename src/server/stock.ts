import { Prisma, type BatchSource, type StockMoveType, type WasteCause } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { qty, round3, startOfTodayIst } from "@/lib/utils";

type Tx = Prisma.TransactionClient;

export type StockPick = { batchId: string; lotNo: string; qty: number };

type Lot = { id: string; itemId: string; lotNo: string; qtyOnHand: number };

export type ConsumeLine = {
  itemId: string;
  qty: number;
  moveType: StockMoveType;
  refType: string;
  refId: string;
  notes?: string;
  wasteCause?: WasteCause | null;
};

export type AddStockInput = {
  itemId: string;
  lotNo: string;
  mfgDate?: Date | null;
  expiryDate?: Date | null;
  qty: number;
  source: BatchSource;
  sourceId: string;
  moveType: StockMoveType;
  notes?: string;
};

export type StockAdjustment = {
  itemId: string;
  batchId: string;
  qty: number;
  refType: string;
  refId: string;
  notes: string;
};

function lotKey(itemId: string, lotNo: string) {
  return `${itemId}\u0000${lotNo}`;
}

async function applyQtyDeltas(tx: Tx, deltas: { batchId: string; qty: number }[]) {
  const merged = new Map<string, number>();
  for (const d of deltas) {
    if (!d.batchId) continue;
    merged.set(d.batchId, round3((merged.get(d.batchId) ?? 0) + d.qty));
  }
  const rows = [...merged.entries()].filter(([, delta]) => Math.abs(delta) > 0.0000001);
  if (!rows.length) return;
  await tx.$executeRaw`
    UPDATE "Batch" AS b
    SET "qtyOnHand" = b."qtyOnHand" + v.delta
    FROM (
      VALUES ${Prisma.join(rows.map(([id, delta]) => Prisma.sql`(${id}::text, ${delta}::double precision)`))}
    ) AS v(id, delta)
    WHERE b.id = v.id
  `;
}

export function availableLotWhere(asOf = startOfTodayIst()) {
  return {
    qtyOnHand: { gt: 0 },
    OR: [{ expiryDate: null }, { expiryDate: { gte: asOf } }],
  };
}

async function throwShortage(tx: Tx, itemId: string, remaining: number): Promise<never> {
  const asOf = startOfTodayIst();
  const [item, expired] = await Promise.all([
    tx.item.findUnique({ where: { id: itemId }, select: { name: true, unit: true } }),
    tx.batch.aggregate({
      where: { itemId, qtyOnHand: { gt: 0 }, expiryDate: { lt: asOf } },
      _sum: { qtyOnHand: true },
    }),
  ]);
  const name = item?.name ?? "item";
  const unit = item?.unit;
  const expiredQty = expired._sum.qtyOnHand ?? 0;
  if (expiredQty > 0.0005) {
    throw new Error(
      `Insufficient stock for ${name} (short ${qty(remaining, unit)}). ${qty(expiredQty, unit)} is in expired lots and is not available.`,
    );
  }
  throw new Error(`Insufficient stock for ${name} (short ${qty(remaining, unit)})`);
}

/** FEFO picks for many lines against one lot snapshot. Does not write. */
export async function planFefo(tx: Tx, lines: { itemId: string; qty: number }[]): Promise<StockPick[][]> {
  for (const line of lines) {
    if (round3(line.qty) <= 0) throw new Error("Quantity must be greater than zero");
  }
  const itemIds = [...new Set(lines.map((l) => l.itemId))];
  const asOf = startOfTodayIst();
  const batches = itemIds.length
    ? await tx.batch.findMany({
        where: { itemId: { in: itemIds }, ...availableLotWhere(asOf) },
        orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
        select: { id: true, itemId: true, lotNo: true, qtyOnHand: true },
      })
    : [];
  const byItem = new Map<string, Lot[]>();
  for (const batch of batches) {
    const list = byItem.get(batch.itemId) ?? [];
    list.push({ ...batch });
    byItem.set(batch.itemId, list);
  }

  const planned: StockPick[][] = [];
  for (const line of lines) {
    let remaining = round3(line.qty);
    const picks: StockPick[] = [];
    for (const lot of byItem.get(line.itemId) ?? []) {
      if (remaining <= 0) break;
      const take = round3(Math.min(lot.qtyOnHand, remaining));
      if (take <= 0) continue;
      picks.push({ batchId: lot.id, lotNo: lot.lotNo, qty: take });
      lot.qtyOnHand = round3(lot.qtyOnHand - take);
      remaining = round3(remaining - take);
    }
    if (remaining > 0.0005) await throwShortage(tx, line.itemId, remaining);
    planned.push(picks);
  }
  return planned;
}

export async function assertFefo(tx: Tx, lines: { itemId: string; qty: number }[]) {
  await planFefo(tx, lines);
}

export async function pickFefo(tx: Tx, itemId: string, qtyNeeded: number): Promise<StockPick[]> {
  const [picks] = await planFefo(tx, [{ itemId, qty: qtyNeeded }]);
  return picks;
}

export async function consumeStockLines(tx: Tx, lines: ConsumeLine[]): Promise<StockPick[][]> {
  const planned = await planFefo(
    tx,
    lines.map((line) => ({ itemId: line.itemId, qty: line.qty })),
  );
  await applyQtyDeltas(
    tx,
    planned.flatMap((picks) => picks.map((pick) => ({ batchId: pick.batchId, qty: -pick.qty }))),
  );
  const moves = lines.flatMap((line, i) =>
    planned[i].map((pick) => ({
      itemId: line.itemId,
      batchId: pick.batchId,
      type: line.moveType,
      qty: -pick.qty,
      wasteCause: line.moveType === "WASTE" ? (line.wasteCause ?? "OTHER") : null,
      refType: line.refType,
      refId: line.refId,
      notes: line.notes ?? "",
    })),
  );
  if (moves.length) await tx.stockMove.createMany({ data: moves });
  return planned;
}

export async function consumeStock(tx: Tx, input: ConsumeLine) {
  const [picks] = await consumeStockLines(tx, [input]);
  return picks;
}

export async function addStockMany(tx: Tx, inputs: AddStockInput[]) {
  const normalized = inputs.map((input) => {
    const qty = round3(input.qty);
    if (qty <= 0) throw new Error("Quantity must be greater than zero");
    return { ...input, qty };
  });
  const itemIds = [...new Set(normalized.map((i) => i.itemId))];
  const lotNos = [...new Set(normalized.map((i) => i.lotNo))];
  const existing = itemIds.length
    ? await tx.batch.findMany({
        where: { itemId: { in: itemIds }, lotNo: { in: lotNos } },
        select: { id: true, itemId: true, lotNo: true },
      })
    : [];
  const known = new Map(existing.map((b) => [lotKey(b.itemId, b.lotNo), b.id]));

  const toCreate = new Map<string, AddStockInput & { qty: number }>();
  for (const input of normalized) {
    const key = lotKey(input.itemId, input.lotNo);
    if (known.has(key)) continue;
    const prev = toCreate.get(key);
    if (prev) prev.qty = round3(prev.qty + input.qty);
    else toCreate.set(key, { ...input });
  }
  if (toCreate.size) {
    const created = await tx.batch.createManyAndReturn({
      data: [...toCreate.values()].map((row) => ({
        itemId: row.itemId,
        lotNo: row.lotNo,
        mfgDate: row.mfgDate ?? null,
        expiryDate: row.expiryDate ?? null,
        qtyOnHand: row.qty,
        source: row.source,
        sourceId: row.sourceId,
      })),
      select: { id: true, itemId: true, lotNo: true },
    });
    for (const row of created) known.set(lotKey(row.itemId, row.lotNo), row.id);
  }

  const increments = new Map<string, number>();
  for (const input of normalized) {
    const key = lotKey(input.itemId, input.lotNo);
    if (toCreate.has(key)) continue;
    const id = known.get(key);
    if (!id) throw new Error("Stock lot was not created");
    increments.set(id, round3((increments.get(id) ?? 0) + input.qty));
  }
  await applyQtyDeltas(
    tx,
    [...increments.entries()].map(([batchId, qty]) => ({ batchId, qty })),
  );

  if (normalized.length) {
    await tx.stockMove.createMany({
      data: normalized.map((input) => {
        const batchId = known.get(lotKey(input.itemId, input.lotNo));
        if (!batchId) throw new Error("Stock lot was not created");
        return {
          itemId: input.itemId,
          batchId,
          type: input.moveType,
          qty: input.qty,
          refType: input.source,
          refId: input.sourceId,
          notes: input.notes ?? "",
        };
      }),
    });
  }

  return normalized.map((input) => {
    const id = known.get(lotKey(input.itemId, input.lotNo));
    if (!id) throw new Error("Stock lot was not created");
    return { id };
  });
}

export async function addStock(tx: Tx, input: AddStockInput) {
  const [batch] = await addStockMany(tx, [input]);
  return batch;
}

/** Apply signed quantity changes and write one ADJUST move per row. */
export async function postStockAdjustments(tx: Tx, rows: StockAdjustment[]) {
  if (!rows.length) return;
  await applyQtyDeltas(
    tx,
    rows.map((row) => ({ batchId: row.batchId, qty: row.qty })),
  );
  await tx.stockMove.createMany({
    data: rows.map((row) => ({
      itemId: row.itemId,
      batchId: row.batchId,
      type: "ADJUST" as const,
      qty: row.qty,
      refType: row.refType,
      refId: row.refId,
      notes: row.notes,
    })),
  });
}

export async function getOnHand(itemId?: string) {
  const batches = await prisma.batch.findMany({
    where: { ...(itemId ? { itemId } : {}), ...availableLotWhere() },
    select: { itemId: true, qtyOnHand: true },
  });
  const map: Record<string, number> = {};
  for (const b of batches) map[b.itemId] = (map[b.itemId] ?? 0) + b.qtyOnHand;
  return map;
}

export type StockHint = {
  onHand: number;
  nearestExpiry: string | null;
  lotNo: string | null;
  unit: string;
};

export async function getStockHints(): Promise<Record<string, StockHint>> {
  const batches = await prisma.batch.findMany({
    where: availableLotWhere(),
    select: {
      itemId: true,
      qtyOnHand: true,
      expiryDate: true,
      lotNo: true,
      item: { select: { unit: true } },
    },
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
