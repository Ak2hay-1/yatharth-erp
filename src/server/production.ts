"use server";

import { revalidatePath } from "next/cache";
import { prisma, withTransaction } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OPS } from "@/lib/permissions";
import { addDays, parseNum, requireCalendarDate, requiredString, round3 } from "@/lib/utils";
import { nextNumberTx } from "@/server/numbers";
import { addStockMany, consumeStockLines, postStockAdjustments } from "@/server/stock";
import { productionBatchCost } from "@/server/costing";
import { runAction } from "@/lib/run-action";

function formDate(formData: FormData, key: string, label: string) {
  return requireCalendarDate(requiredString(formData.get(key), label), label);
}

export async function createWorkOrder(formData: FormData) {
  return runAction(async () => {
  await requireRole(OPS);
  const wo = await withTransaction(async (tx) => {
    const number = await nextNumberTx(tx, "WO");
    return tx.workOrder.create({
      data: {
        number,
        recipeId: requiredString(formData.get("recipeId"), "Recipe"),
        plannedQty: parseNum(formData.get("plannedQty")),
        date: formDate(formData, "date", "Date"),
        notes: String(formData.get("notes") ?? ""),
      },
    });
  });
  revalidatePath("/production/orders");
  return { redirectTo: `/production/orders/${wo.id}` };
  });
}

export async function cancelWorkOrder(id: string) {
  return runAction(async () => {
    await requireRole(OPS);
    const wo = await prisma.workOrder.findUnique({
      where: { id },
      include: { batches: { select: { id: true, status: true } } },
    });
    if (!wo) throw new Error("Work order not found");
    const liveBatches = wo.batches.filter((b) => b.status !== "CANCELLED");
    if (wo.status === "COMPLETED" || liveBatches.length > 0) {
      throw new Error("Reverse the production batch before cancelling this work order");
    }
    if (wo.status === "CANCELLED") throw new Error("Work order is already cancelled");
    await prisma.workOrder.update({ where: { id }, data: { status: "CANCELLED" } });
    revalidatePath(`/production/orders/${id}`);
    revalidatePath("/production/orders");
  });
}

export async function startWorkOrder(id: string) {
  return runAction(async () => {
    await requireRole(OPS);
    const wo = await prisma.workOrder.findUnique({ where: { id } });
    if (!wo) throw new Error("Work order not found");
    if (wo.status === "CANCELLED") throw new Error("Work order is cancelled");
    if (wo.status === "COMPLETED") throw new Error("Work order is already complete");
    if (wo.status === "DRAFT") {
      await prisma.workOrder.update({ where: { id }, data: { status: "CONFIRMED" } });
    }
    revalidatePath(`/production/orders/${id}`);
    revalidatePath("/production/orders");
  });
}

export async function reverseWorkOrder(id: string) {
  return runAction(async () => {
    await requireRole(OPS);
    await withTransaction(async (tx) => {
      const wo = await tx.workOrder.findUnique({
        where: { id },
        include: { batches: true },
      });
      if (!wo) throw new Error("Work order not found");
      const live = wo.batches.filter((b) => b.status !== "CANCELLED");
      if (!live.length) throw new Error("This work order has no production to reverse");

      const neededByBatch = new Map<string, { number: string; qty: number }>();
      for (const prod of live) {
        if (!prod.batchId) throw new Error(`Batch ${prod.number} is not linked to stock`);
        const prev = neededByBatch.get(prod.batchId);
        neededByBatch.set(prod.batchId, {
          number: prev?.number ?? prod.number,
          qty: (prev?.qty ?? 0) + prod.outputQty,
        });
      }
      const stockRows = await tx.batch.findMany({
        where: { id: { in: [...neededByBatch.keys()] } },
        select: { id: true, itemId: true, qtyOnHand: true },
      });
      const byId = new Map(stockRows.map((batch) => [batch.id, { ...batch }]));
      for (const [batchId, need] of neededByBatch) {
        const batch = byId.get(batchId);
        if (!batch || batch.qtyOnHand + 0.0005 < need.qty) {
          throw new Error(`Finished goods from ${need.number} have already been used`);
        }
      }

      await postStockAdjustments(
        tx,
        live.map((prod) => {
          const batch = byId.get(prod.batchId!);
          if (!batch) throw new Error(`Batch ${prod.number} is not linked to stock`);
          return {
            itemId: batch.itemId,
            batchId: batch.id,
            qty: -prod.outputQty,
            refType: "PRODUCTION",
            refId: prod.id,
            notes: `Reverse ${prod.number}`,
          };
        }),
      );
      await tx.productionBatch.updateMany({
        where: { id: { in: live.map((prod) => prod.id) } },
        data: { status: "CANCELLED" },
      });

      const moves = await tx.stockMove.findMany({
        where: { refType: "PRODUCTION", refId: wo.id, type: { in: ["PRODUCTION_OUT", "ADJUST"] } },
      });
      const net = new Map<string, { itemId: string; batchId: string; qty: number }>();
      for (const move of moves) {
        if (move.type === "ADJUST" && !move.notes.startsWith("Reverse")) continue;
        const cur = net.get(move.batchId) ?? { itemId: move.itemId, batchId: move.batchId, qty: 0 };
        cur.qty = round3(cur.qty + move.qty);
        net.set(move.batchId, cur);
      }
      await postStockAdjustments(
        tx,
        [...net.values()].flatMap((row) => {
          const qtyBack = round3(-row.qty);
          if (qtyBack <= 0.0005) return [];
          return [{
            itemId: row.itemId,
            batchId: row.batchId,
            qty: qtyBack,
            refType: "PRODUCTION",
            refId: wo.id,
            notes: `Reverse ${wo.number}`,
          }];
        }),
      );

      await tx.workOrder.update({ where: { id }, data: { status: "DRAFT" } });
    });
    revalidatePath(`/production/orders/${id}`);
    revalidatePath("/production/orders");
    revalidatePath("/production/batches");
    revalidatePath("/inventory/stock");
  });
}

export async function produceBatch(formData: FormData) {
  return runAction(async () => {
  await requireRole(OPS);
  const workOrderId = requiredString(formData.get("workOrderId"), "Work order");
  const outputQty = parseNum(formData.get("outputQty"));
  const wastageQty = parseNum(formData.get("wastageQty"));
  const rejectQty = parseNum(formData.get("rejectQty"));
  const lotNo = requiredString(formData.get("lotNo"), "Lot no");
  const mfgDate = formDate(formData, "mfgDate", "Mfg date");
  const operator = String(formData.get("operator") ?? "");
  const actualWeightRaw = String(formData.get("actualWeight") ?? "");
  const actualWeight = actualWeightRaw ? parseNum(formData.get("actualWeight")) : null;
  const coatingOk = formData.get("coatingOk") !== "false";
  const bmrNotes = String(formData.get("bmrNotes") ?? "");

  const produced = await withTransaction(async (tx) => {
    const wo = await tx.workOrder.findUnique({
      where: { id: workOrderId },
      include: { recipe: { include: { lines: { include: { item: true } }, finishedItem: true } } },
    });
    if (!wo) throw new Error("Work order not found");
    if (wo.status === "CANCELLED") throw new Error("Work order is cancelled");
    if (wo.status !== "CONFIRMED") throw new Error("Start the work order before completing it");
    if (wo.recipe.outputQty <= 0) throw new Error("Recipe output quantity is invalid");

    const scale = (outputQty + wastageQty + rejectQty) / wo.recipe.outputQty;
    await consumeStockLines(
      tx,
      wo.recipe.lines.map((line) => ({
        itemId: line.itemId,
        qty: line.qty * scale,
        moveType: "PRODUCTION_OUT" as const,
        refType: "PRODUCTION",
        refId: workOrderId,
        notes: `WO ${wo.number}`,
      })),
    );

    const expiryRaw = String(formData.get("expiryDate") ?? "").trim();
    const expiryDate = expiryRaw
      ? requireCalendarDate(expiryRaw, "Expiry")
      : addDays(mfgDate, wo.recipe.finishedItem.shelfLifeDays);

    const { totalCost, unitCost } = await productionBatchCost(tx, wo.recipe, outputQty, wastageQty + rejectQty);

    const number = await nextNumberTx(tx, "PRD");
    const prod = await tx.productionBatch.create({
      data: {
        number,
        workOrderId,
        outputQty,
        wastageQty,
        rejectQty,
        unitCost,
        totalCost,
        lotNo,
        mfgDate,
        expiryDate,
        operator,
        actualWeight,
        coatingOk,
        bmrNotes,
        status: "CONFIRMED",
        notes: String(formData.get("notes") ?? ""),
      },
    });

    const [batch] = await addStockMany(tx, [{
      itemId: wo.recipe.finishedItemId,
      lotNo,
      mfgDate,
      expiryDate,
      qty: outputQty,
      source: "PRODUCTION",
      sourceId: prod.id,
      moveType: "PRODUCTION_IN",
      notes: `PRD ${number}`,
    }]);

    if (wastageQty > 0 || rejectQty > 0) {
      await tx.stockMove.create({
        data: {
          itemId: wo.recipe.finishedItemId,
          batchId: batch.id,
          type: "WASTE",
          qty: 0,
          wasteCause: "PRODUCTION",
          refType: "PRODUCTION",
          refId: prod.id,
          notes: `Yield loss ${wastageQty} / reject ${rejectQty} ${wo.recipe.finishedItem.unit} on ${number}`,
        },
      });
    }

    await tx.productionBatch.update({
      where: { id: prod.id },
      data: { batchId: batch.id },
    });
    await tx.workOrder.update({
      where: { id: workOrderId },
      data: { status: "COMPLETED" },
    });
    return prod;
  });

  revalidatePath("/production/orders");
  revalidatePath("/inventory/stock");
  return { redirectTo: `/production/batches/${produced.id}` };
  });
}
