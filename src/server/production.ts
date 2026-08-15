"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OPS } from "@/lib/permissions";
import { addDays, parseNum, requiredString } from "@/lib/utils";
import { nextNumberTx } from "@/server/numbers";
import { addStock, consumeStock } from "@/server/stock";
import { productionBatchCost } from "@/server/costing";

export async function createWorkOrder(formData: FormData) {
  await requireRole(OPS);
  const wo = await prisma.$transaction(async (tx) => {
    const number = await nextNumberTx(tx, "WO");
    return tx.workOrder.create({
      data: {
        number,
        recipeId: requiredString(formData.get("recipeId"), "Recipe"),
        plannedQty: parseNum(formData.get("plannedQty")),
        date: new Date(requiredString(formData.get("date"), "Date")),
        notes: String(formData.get("notes") ?? ""),
      },
    });
  });
  revalidatePath("/production/orders");
  redirect(`/production/orders/${wo.id}`);
}

export async function produceBatch(formData: FormData) {
  await requireRole(OPS);
  const workOrderId = requiredString(formData.get("workOrderId"), "Work order");
  const outputQty = parseNum(formData.get("outputQty"));
  const wastageQty = parseNum(formData.get("wastageQty"));
  const rejectQty = parseNum(formData.get("rejectQty"));
  const lotNo = requiredString(formData.get("lotNo"), "Lot no");
  const mfgDate = new Date(requiredString(formData.get("mfgDate"), "Mfg date"));
  const operator = String(formData.get("operator") ?? "");
  const actualWeightRaw = String(formData.get("actualWeight") ?? "");
  const actualWeight = actualWeightRaw ? parseNum(formData.get("actualWeight")) : null;
  const coatingOk = formData.get("coatingOk") !== "false";
  const bmrNotes = String(formData.get("bmrNotes") ?? "");

  const produced = await prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.findUnique({
      where: { id: workOrderId },
      include: { recipe: { include: { lines: { include: { item: true } }, finishedItem: true } } },
    });
    if (!wo) throw new Error("Work order not found");
    if (wo.status === "CANCELLED") throw new Error("Work order is cancelled");
    if (wo.recipe.outputQty <= 0) throw new Error("Recipe output quantity is invalid");

    const scale = (outputQty + wastageQty + rejectQty) / wo.recipe.outputQty;
    for (const line of wo.recipe.lines) {
      await consumeStock(tx, {
        itemId: line.itemId,
        qty: line.qty * scale,
        moveType: "PRODUCTION_OUT",
        refType: "PRODUCTION",
        refId: workOrderId,
        notes: `WO ${wo.number}`,
      });
    }

    const expiryDate = formData.get("expiryDate")
      ? new Date(String(formData.get("expiryDate")))
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

    const batch = await addStock(tx, {
      itemId: wo.recipe.finishedItemId,
      lotNo,
      mfgDate,
      expiryDate,
      qty: outputQty,
      source: "PRODUCTION",
      sourceId: prod.id,
      moveType: "PRODUCTION_IN",
      notes: `PRD ${number}`,
    });

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
  redirect(`/production/batches/${produced.id}`);
}
