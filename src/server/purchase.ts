"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FINANCE, OPS } from "@/lib/permissions";
import { parseNum, requiredString } from "@/lib/utils";
import { nextNumberTx } from "@/server/numbers";
import { addStock } from "@/server/stock";
import { isInterstate, sumTax, taxLine } from "@/lib/gst";

type Line = { itemId: string; qty: number; rate: number; lotNo?: string; mfgDate?: string; expiryDate?: string };

function parseLines(formData: FormData): Line[] {
  const raw = JSON.parse(String(formData.get("lines") ?? "[]")) as Line[];
  const lines = raw.filter((l) => l.itemId && Number(l.qty) > 0);
  if (!lines.length) throw new Error("Add at least one line");
  return lines.map((l) => ({ ...l, qty: Number(l.qty), rate: Number(l.rate) || 0 }));
}

export async function createPurchaseOrder(formData: FormData) {
  await requireRole(OPS);
  const lines = parseLines(formData);
  const po = await prisma.$transaction(async (tx) => {
    const number = await nextNumberTx(tx, "PO");
    return tx.purchaseOrder.create({
      data: {
        number,
        supplierId: requiredString(formData.get("supplierId"), "Supplier"),
        date: new Date(requiredString(formData.get("date"), "Date")),
        notes: String(formData.get("notes") ?? ""),
        lines: {
          create: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })),
        },
      },
    });
  });
  revalidatePath("/purchase/orders");
  redirect(`/purchase/orders/${po.id}`);
}

export async function confirmPurchaseOrder(id: string) {
  await requireRole(OPS);
  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { lines: true } });
  if (!po || po.status !== "DRAFT") throw new Error("Only draft POs can be confirmed");
  if (!po.lines.length) throw new Error("PO has no lines");
  await prisma.purchaseOrder.update({ where: { id }, data: { status: "CONFIRMED" } });
  revalidatePath(`/purchase/orders/${id}`);
}

export async function createGoodsReceipt(formData: FormData) {
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
  const grn = await prisma.$transaction(async (tx) => {
    const number = await nextNumberTx(tx, "GRN");
    return tx.goodsReceipt.create({
      data: {
        number,
        poId,
        date: new Date(requiredString(formData.get("date"), "Date")),
        notes: String(formData.get("notes") ?? ""),
        lines: {
          create: lines.map((l) => ({
            itemId: l.itemId,
            qty: l.qty,
            lotNo: l.lotNo!,
            mfgDate: l.mfgDate ? new Date(l.mfgDate) : null,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : null,
          })),
        },
      },
    });
  });
  revalidatePath("/purchase/grn");
  redirect(`/purchase/grn/${grn.id}`);
}

export async function confirmGoodsReceipt(id: string) {
  await requireRole(OPS);
  await prisma.$transaction(async (tx) => {
    const grn = await tx.goodsReceipt.findUnique({
      where: { id },
      include: { lines: true, po: true },
    });
    if (!grn || grn.status !== "DRAFT") throw new Error("Only draft GRNs can be confirmed");
    for (const line of grn.lines) {
      const batch = await addStock(tx, {
        itemId: line.itemId,
        lotNo: line.lotNo,
        mfgDate: line.mfgDate,
        expiryDate: line.expiryDate,
        qty: line.qty,
        source: "PURCHASE",
        sourceId: grn.id,
        moveType: "PURCHASE",
        notes: `GRN ${grn.number}`,
      });
      await tx.goodsReceiptLine.update({
        where: { id: line.id },
        data: { batchId: batch.id },
      });
    }
    await tx.goodsReceipt.update({ where: { id }, data: { status: "CONFIRMED" } });

    const po = await tx.purchaseOrder.findUnique({
      where: { id: grn.poId },
      include: {
        lines: true,
        receipts: { where: { status: "CONFIRMED" }, include: { lines: true } },
      },
    });
    if (po) {
      const received: Record<string, number> = {};
      for (const receipt of po.receipts) {
        for (const line of receipt.lines) {
          received[line.itemId] = (received[line.itemId] ?? 0) + line.qty;
        }
      }
      const complete = po.lines.every((l) => (received[l.itemId] ?? 0) + 0.0005 >= l.qty);
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: complete ? "COMPLETED" : "CONFIRMED" },
      });
    }
  });
  revalidatePath(`/purchase/grn/${id}`);
  revalidatePath("/inventory/stock");
}

export async function updatePurchaseOrder(id: string, formData: FormData) {
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
        date: new Date(requiredString(formData.get("date"), "Date")),
        notes: String(formData.get("notes") ?? ""),
        lines: { create: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })) },
      },
    }),
  ]);
  revalidatePath(`/purchase/orders/${id}`);
  revalidatePath("/purchase/orders");
}

export async function cancelPurchaseOrder(id: string) {
  await requireRole(OPS);
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po || po.status !== "DRAFT") throw new Error("Only draft POs can be cancelled");
  await prisma.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath(`/purchase/orders/${id}`);
  revalidatePath("/purchase/orders");
}

export async function updateGoodsReceipt(id: string, formData: FormData) {
  await requireRole(OPS);
  const grn = await prisma.goodsReceipt.findUnique({ where: { id } });
  if (!grn || grn.status !== "DRAFT") throw new Error("Only draft GRNs can be edited");
  const lines = parseLines(formData);
  for (const line of lines) {
    if (!line.lotNo) throw new Error("Lot number is required on every GRN line");
  }
  await prisma.$transaction([
    prisma.goodsReceiptLine.deleteMany({ where: { grnId: id } }),
    prisma.goodsReceipt.update({
      where: { id },
      data: {
        date: new Date(requiredString(formData.get("date"), "Date")),
        notes: String(formData.get("notes") ?? ""),
        lines: {
          create: lines.map((l) => ({
            itemId: l.itemId,
            qty: l.qty,
            lotNo: l.lotNo!,
            mfgDate: l.mfgDate ? new Date(l.mfgDate) : null,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : null,
          })),
        },
      },
    }),
  ]);
  revalidatePath(`/purchase/grn/${id}`);
}

export async function cancelGoodsReceipt(id: string) {
  await requireRole(OPS);
  const grn = await prisma.goodsReceipt.findUnique({ where: { id } });
  if (!grn || grn.status !== "DRAFT") throw new Error("Only draft GRNs can be cancelled");
  await prisma.goodsReceipt.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath(`/purchase/grn/${id}`);
  revalidatePath("/purchase/grn");
}

export async function createSupplierBill(formData: FormData) {
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

  const rateMap = Object.fromEntries(
    (await prisma.purchaseOrderLine.findMany({ where: { poId: grn.poId } })).map((l) => [
      l.itemId,
      l.rate,
    ]),
  );

  const computed = grn.lines.map((line) => {
    const rate = rateMap[line.itemId] ?? line.item.purchasePrice;
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

  const bill = await prisma.$transaction(async (tx) => {
    const number = await nextNumberTx(tx, "BILL");
    return tx.supplierBill.create({
      data: {
        number,
        supplierId: supplier.id,
        grnId: grn.id,
        date: new Date(requiredString(formData.get("date"), "Date")),
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
}

export async function adjustStock(formData: FormData) {
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

  await prisma.$transaction(async (tx) => {
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
      const mfg = formData.get("mfgDate") ? new Date(String(formData.get("mfgDate"))) : new Date();
      const expiry = item
        ? new Date(mfg.getTime() + item.shelfLifeDays * 86400000)
        : null;
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
}
