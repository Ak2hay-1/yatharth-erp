"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma, withTransaction } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FINANCE, OPS } from "@/lib/permissions";
import { addDays, parseNum, requireCalendarDate, requiredString, round3, startOfTodayIst } from "@/lib/utils";
import { nextNumberTx } from "@/server/numbers";
import { addStock, addStockMany, postStockAdjustments } from "@/server/stock";
import { isInterstate, sumTax, taxLine } from "@/lib/gst";
import { runAction } from "@/lib/run-action";

type Line = { itemId: string; qty: number; rate: number; lotNo?: string; mfgDate?: string; expiryDate?: string };
type Tx = Prisma.TransactionClient;

function formDate(formData: FormData, key: string, label: string) {
  return requireCalendarDate(requiredString(formData.get(key), label), label);
}

function optionalDate(raw: string | undefined, label: string) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return requireCalendarDate(value, label);
}

function parseLines(formData: FormData): Line[] {
  const raw = JSON.parse(String(formData.get("lines") ?? "[]")) as Line[];
  const lines = raw.filter((l) => l.itemId && Number(l.qty) > 0);
  if (!lines.length) throw new Error("Add at least one line");
  return lines.map((l) => ({
    ...l,
    qty: Number(l.qty),
    rate: Number.isFinite(Number(l.rate)) ? Number(l.rate) : 0,
  }));
}

async function assertGrnWithinPo(tx: Tx, poId: string, lines: { itemId: string; qty: number }[], excludeGrnId?: string) {
  const po = await tx.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      lines: true,
      receipts: { where: { status: "CONFIRMED" }, include: { lines: true } },
    },
  });
  if (!po) throw new Error("Purchase order not found");
  const ordered: Record<string, number> = {};
  for (const line of po.lines) ordered[line.itemId] = (ordered[line.itemId] ?? 0) + line.qty;
  const received: Record<string, number> = {};
  for (const receipt of po.receipts) {
    if (excludeGrnId && receipt.id === excludeGrnId) continue;
    for (const line of receipt.lines) received[line.itemId] = (received[line.itemId] ?? 0) + line.qty;
  }
  const adding: Record<string, number> = {};
  for (const line of lines) adding[line.itemId] = (adding[line.itemId] ?? 0) + line.qty;
  const items = await tx.item.findMany({
    where: { id: { in: Object.keys(adding) } },
    select: { id: true, name: true },
  });
  const names = Object.fromEntries(items.map((i) => [i.id, i.name]));
  for (const [itemId, qty] of Object.entries(adding)) {
    if ((ordered[itemId] ?? 0) <= 0) throw new Error(`${names[itemId] ?? "Item"} is not on this purchase order`);
    const left = round3((ordered[itemId] ?? 0) - (received[itemId] ?? 0));
    if (qty - left > 0.0005) {
      throw new Error(
        `${names[itemId] ?? "Item"} is ${round3(qty - Math.max(left, 0))} over the purchase order. Remaining ${Math.max(left, 0)}.`,
      );
    }
  }
}

async function refreshPoReceiptStatus(tx: Tx, poId: string) {
  const po = await tx.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      lines: true,
      receipts: { where: { status: "CONFIRMED" }, include: { lines: true } },
    },
  });
  if (!po || po.status === "DRAFT" || po.status === "CANCELLED") return;
  const received: Record<string, number> = {};
  for (const receipt of po.receipts) {
    for (const line of receipt.lines) received[line.itemId] = (received[line.itemId] ?? 0) + line.qty;
  }
  const complete = po.lines.length > 0 && po.lines.every((l) => (received[l.itemId] ?? 0) + 0.0005 >= l.qty);
  await tx.purchaseOrder.update({
    where: { id: po.id },
    data: { status: complete ? "COMPLETED" : "CONFIRMED" },
  });
}

function grnLineData(l: Line) {
  return {
    itemId: l.itemId,
    qty: l.qty,
    rate: l.rate,
    lotNo: l.lotNo!,
    mfgDate: optionalDate(l.mfgDate, "Mfg date"),
    expiryDate: optionalDate(l.expiryDate, "Expiry"),
  };
}

export async function createPurchaseOrder(formData: FormData) {
  return runAction(async () => {
  await requireRole(OPS);
  const lines = parseLines(formData);
  const po = await withTransaction(async (tx) => {
    const number = await nextNumberTx(tx, "PO");
    return tx.purchaseOrder.create({
      data: {
        number,
        supplierId: requiredString(formData.get("supplierId"), "Supplier"),
        date: formDate(formData, "date", "Date"),
        notes: String(formData.get("notes") ?? ""),
        lines: {
          create: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })),
        },
      },
    });
  });
  revalidatePath("/purchase/orders");
  redirect(`/purchase/orders/${po.id}`);
  });
}

export async function confirmPurchaseOrder(id: string) {
  return runAction(async () => {
  await requireRole(OPS);
  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { lines: true } });
  if (!po || po.status !== "DRAFT") throw new Error("Only draft POs can be confirmed");
  if (!po.lines.length) throw new Error("PO has no lines");
  await prisma.purchaseOrder.update({ where: { id }, data: { status: "CONFIRMED" } });
  revalidatePath(`/purchase/orders/${id}`);
  });
}

export async function createGoodsReceipt(formData: FormData) {
  return runAction(async () => {
  await requireRole(OPS);
  const poId = requiredString(formData.get("poId"), "Purchase order");
  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po || po.status === "DRAFT" || po.status === "CANCELLED") {
    throw new Error("GRN can only be made against a confirmed PO");
  }
  const lines = parseLines(formData);
  for (const line of lines) {
    if (!line.lotNo) throw new Error("Lot number is required on every GRN line");
  }
  const grn = await withTransaction(async (tx) => {
    await assertGrnWithinPo(tx, poId, lines);
    const number = await nextNumberTx(tx, "GRN");
    return tx.goodsReceipt.create({
      data: {
        number,
        poId,
        date: formDate(formData, "date", "Date"),
        notes: String(formData.get("notes") ?? ""),
        lines: { create: lines.map(grnLineData) },
      },
    });
  });
  revalidatePath("/purchase/grn");
  redirect(`/purchase/grn/${grn.id}`);
  });
}

export async function confirmGoodsReceipt(id: string) {
  return runAction(async () => {
  await requireRole(OPS);
  await withTransaction(async (tx) => {
    const grn = await tx.goodsReceipt.findUnique({
      where: { id },
      include: { lines: true, po: true },
    });
    if (!grn || grn.status !== "DRAFT") throw new Error("Only draft GRNs can be confirmed");
    await assertGrnWithinPo(tx, grn.poId, grn.lines, grn.id);
    const batches = await addStockMany(
      tx,
      grn.lines.map((line) => ({
        itemId: line.itemId,
        lotNo: line.lotNo,
        mfgDate: line.mfgDate,
        expiryDate: line.expiryDate,
        qty: line.qty,
        source: "PURCHASE" as const,
        sourceId: grn.id,
        moveType: "PURCHASE" as const,
        notes: `GRN ${grn.number}`,
      })),
    );
    if (grn.lines.length) {
      await tx.$executeRaw`
        UPDATE "GoodsReceiptLine" AS g
        SET "batchId" = v.batch_id
        FROM (
          VALUES ${Prisma.join(
            grn.lines.map((line, index) => Prisma.sql`(${line.id}::text, ${batches[index].id}::text)`),
          )}
        ) AS v(id, batch_id)
        WHERE g.id = v.id
      `;
    }
    await tx.goodsReceipt.update({ where: { id }, data: { status: "CONFIRMED" } });
    await refreshPoReceiptStatus(tx, grn.poId);
  });
  revalidatePath(`/purchase/grn/${id}`);
  revalidatePath("/inventory/stock");
  });
}

export async function updatePurchaseOrder(id: string, formData: FormData) {
  return runAction(async () => {
  await requireRole(OPS);
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po || po.status !== "DRAFT") throw new Error("Only draft POs can be edited");
  const lines = parseLines(formData);
  await prisma.$transaction([
    prisma.purchaseOrderLine.deleteMany({ where: { poId: id } }),
    prisma.purchaseOrder.update({
      where: { id },
      data: {
        supplierId: requiredString(formData.get("supplierId"), "Supplier"),
        date: formDate(formData, "date", "Date"),
        notes: String(formData.get("notes") ?? ""),
        lines: { create: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })) },
      },
    }),
  ]);
  revalidatePath(`/purchase/orders/${id}`);
  revalidatePath("/purchase/orders");
  });
}

type ReceiptToVoid = {
  id: string;
  number: string;
  poId: string;
  lines: { itemId: string; qty: number; lotNo: string; batchId: string | null }[];
  bills: { id: string; number: string; paid: number }[];
};

async function voidConfirmedReceipt(tx: Tx, grn: ReceiptToVoid) {
  for (const bill of grn.bills) {
    if (bill.paid > 0.009) {
      throw new Error(`Void the payment on bill ${bill.number} before reversing this receipt`);
    }
  }
  if (grn.bills.length) {
    await tx.supplierBill.updateMany({
      where: { id: { in: grn.bills.map((bill) => bill.id) } },
      data: { status: "CANCELLED" },
    });
  }
  const batchIds = grn.lines.map((line) => line.batchId).filter((id): id is string => !!id);
  const batches = batchIds.length
    ? await tx.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, qtyOnHand: true } })
    : [];
  const onHand = new Map(batches.map((batch) => [batch.id, batch.qtyOnHand]));
  const rows = [];
  for (const line of grn.lines) {
    if (!line.batchId) throw new Error(`Lot ${line.lotNo} is not linked to stock`);
    const have = onHand.get(line.batchId);
    if (have == null || have + 0.0005 < line.qty) {
      throw new Error(`Stock from lot ${line.lotNo} has already been used`);
    }
    onHand.set(line.batchId, round3(have - line.qty));
    rows.push({
      itemId: line.itemId,
      batchId: line.batchId,
      qty: -line.qty,
      refType: "GRN",
      refId: grn.id,
      notes: `Void ${grn.number}`,
    });
  }
  await postStockAdjustments(tx, rows);
  await tx.goodsReceipt.update({ where: { id: grn.id }, data: { status: "CANCELLED" } });
}

export async function cancelPurchaseOrder(id: string) {
  return runAction(async () => {
  await requireRole(OPS);
  await withTransaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id },
      include: {
        receipts: {
          where: { status: "CONFIRMED" },
          include: {
            lines: true,
            bills: { where: { status: { not: "CANCELLED" } }, select: { id: true, number: true, paid: true } },
          },
        },
      },
    });
    if (!po || po.status === "CANCELLED") throw new Error("This purchase order cannot be cancelled");
    if (po.status !== "DRAFT" && po.status !== "CONFIRMED" && po.status !== "COMPLETED") {
      throw new Error("This purchase order cannot be cancelled");
    }
    for (const grn of po.receipts) await voidConfirmedReceipt(tx, grn);
    await tx.goodsReceipt.updateMany({
      where: { poId: id, status: "DRAFT" },
      data: { status: "CANCELLED" },
    });
    await tx.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  });
  revalidatePath(`/purchase/orders/${id}`);
  revalidatePath("/purchase/orders");
  revalidatePath("/purchase/grn");
  revalidatePath("/purchase/bills");
  revalidatePath("/inventory/stock");
  });
}

export async function updateGoodsReceipt(id: string, formData: FormData) {
  return runAction(async () => {
  await requireRole(OPS);
  const grn = await prisma.goodsReceipt.findUnique({ where: { id } });
  if (!grn || grn.status !== "DRAFT") throw new Error("Only draft GRNs can be edited");
  const lines = parseLines(formData);
  for (const line of lines) {
    if (!line.lotNo) throw new Error("Lot number is required on every GRN line");
  }
  await withTransaction(async (tx) => {
    await assertGrnWithinPo(tx, grn.poId, lines, id);
    await tx.goodsReceiptLine.deleteMany({ where: { grnId: id } });
    await tx.goodsReceipt.update({
      where: { id },
      data: {
        date: formDate(formData, "date", "Date"),
        notes: String(formData.get("notes") ?? ""),
        lines: { create: lines.map(grnLineData) },
      },
    });
  });
  revalidatePath(`/purchase/grn/${id}`);
  });
}

export async function cancelGoodsReceipt(id: string) {
  return runAction(async () => {
  await requireRole(OPS);
  await withTransaction(async (tx) => {
    const grn = await tx.goodsReceipt.findUnique({
      where: { id },
      include: {
        lines: true,
        bills: { where: { status: { not: "CANCELLED" } }, select: { id: true, number: true, paid: true } },
      },
    });
    if (!grn || (grn.status !== "DRAFT" && grn.status !== "CONFIRMED")) {
      throw new Error("This GRN cannot be cancelled");
    }
    if (grn.status === "CONFIRMED") await voidConfirmedReceipt(tx, grn);
    else await tx.goodsReceipt.update({ where: { id }, data: { status: "CANCELLED" } });
    await refreshPoReceiptStatus(tx, grn.poId);
  });
  revalidatePath(`/purchase/grn/${id}`);
  revalidatePath("/purchase/grn");
  revalidatePath("/purchase/bills");
  revalidatePath("/purchase/orders");
  revalidatePath("/inventory/stock");
  });
}

export async function createSupplierBill(formData: FormData) {
  return runAction(async () => {
  await requireRole(FINANCE);
  const grnId = requiredString(formData.get("grnId"), "GRN");
  const grn = await prisma.goodsReceipt.findUnique({
    where: { id: grnId },
    include: { lines: { include: { item: true } }, po: true },
  });
  if (!grn || grn.status !== "CONFIRMED") throw new Error("Bill can only be made from a confirmed GRN");

  const company = await prisma.company.findUnique({ where: { id: "default" } });
  const supplier = await prisma.party.findUnique({ where: { id: grn.po.supplierId } });
  if (!company || !supplier) throw new Error("Company or supplier missing");
  const interstate = isInterstate(company.stateCode, supplier.stateCode);

  const computed = grn.lines.map((line) => {
    const rate = line.rate;
    const tax = taxLine({ qty: line.qty, rate, gstRate: line.item.gstRate }, interstate);
    return {
      itemId: line.itemId,
      qty: line.qty,
      rate,
      hsn: line.item.hsn,
      gstRate: line.item.gstRate,
      ...tax,
    };
  });
  const totals = sumTax(computed);

  const bill = await withTransaction(async (tx) => {
    const number = await nextNumberTx(tx, "BILL");
    return tx.supplierBill.create({
      data: {
        number,
        supplierId: supplier.id,
        grnId: grn.id,
        date: formDate(formData, "date", "Date"),
        isInterstate: interstate,
        taxable: totals.taxable,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        total: totals.total,
        status: "CONFIRMED",
        notes: String(formData.get("notes") ?? ""),
        lines: {
          create: computed.map((l) => ({
            itemId: l.itemId,
            qty: l.qty,
            rate: l.rate,
            hsn: l.hsn,
            gstRate: l.gstRate,
            taxable: l.taxable,
            cgst: l.cgst,
            sgst: l.sgst,
            igst: l.igst,
          })),
        },
      },
    });
  });
  revalidatePath("/purchase/bills");
  redirect(`/purchase/bills/${bill.id}`);
  });
}

export async function cancelSupplierBill(id: string) {
  return runAction(async () => {
    await requireRole(FINANCE);
    const bill = await prisma.supplierBill.findUnique({ where: { id } });
    if (!bill || bill.status === "CANCELLED") throw new Error("This bill cannot be cancelled");
    if (bill.paid > 0.009) throw new Error("Void the payment before cancelling this bill");
    await prisma.supplierBill.update({ where: { id }, data: { status: "CANCELLED" } });
    revalidatePath(`/purchase/bills/${id}`);
    revalidatePath("/purchase/bills");
  });
}

export async function adjustStock(formData: FormData) {
  return runAction(async () => {
  await requireRole(OPS);
  const itemId = requiredString(formData.get("itemId"), "Item");
  const qty = parseNum(formData.get("qty"));
  const reason = requiredString(formData.get("reason"), "Reason");
  const type = requiredString(formData.get("adjustType"), "Type"); // WASTE | ADJUST
  const notes = String(formData.get("notes") ?? "");
  const wasteCauseRaw = String(formData.get("wasteCause") ?? "OTHER");
  const wasteCause =
    wasteCauseRaw === "PRODUCTION" || wasteCauseRaw === "FREEZER" || wasteCauseRaw === "RETURN" || wasteCauseRaw === "OTHER"
      ? wasteCauseRaw
      : "OTHER";

  await withTransaction(async (tx) => {
    if (qty < 0) {
      const { consumeStock } = await import("@/server/stock");
      await consumeStock(tx, {
        itemId,
        qty: Math.abs(qty),
        moveType: type === "WASTE" ? "WASTE" : "ADJUST",
        refType: "ADJUST",
        refId: "manual",
        notes: `${reason}. ${notes}`.trim(),
        wasteCause: type === "WASTE" ? wasteCause : null,
      });
    } else {
      const item = await tx.item.findUnique({ where: { id: itemId } });
      const lotNo = String(formData.get("lotNo") ?? "").trim() || `ADJ-${Date.now()}`;
      const mfgRaw = String(formData.get("mfgDate") ?? "").trim();
      const mfg = mfgRaw ? requireCalendarDate(mfgRaw, "Mfg date") : startOfTodayIst();
      const expiry = item ? addDays(mfg, item.shelfLifeDays) : null;
      await addStock(tx, {
        itemId,
        lotNo,
        mfgDate: mfg,
        expiryDate: expiry,
        qty,
        source: "ADJUST",
        sourceId: "manual",
        moveType: "ADJUST",
        notes: `${reason}. ${notes}`.trim(),
      });
    }
  });
  revalidatePath("/inventory/stock");
  redirect("/inventory/stock?adjusted=1");
  });
}
