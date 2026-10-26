"use server";

import { revalidatePath } from "next/cache";
import type { CustomerChannel, Prisma, SalesOrderKind } from "@prisma/client";
import { prisma, withTransaction } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OPS } from "@/lib/permissions";
import { addDays, parseCalendarDateTime, requireCalendarDate, requiredString, startOfTodayIst } from "@/lib/utils";
import { isInterstate, sumTax, taxLine, type TaxLine } from "@/lib/gst";
import { nextNumberTx } from "@/server/numbers";
import { assertFefo, consumeStockLines, postStockAdjustments } from "@/server/stock";
import { assertCreditOk } from "@/server/credit";
import { runAction } from "@/lib/run-action";

function formDate(formData: FormData, key: string, label: string) {
  return requireCalendarDate(requiredString(formData.get(key), label), label);
}

function formDateOptional(raw: string, label: string) {
  const value = raw.trim();
  if (!value) return null;
  return requireCalendarDate(value, label);
}

type Line = { itemId: string; qty: number; rate: number };

function parseLines(formData: FormData): Line[] {
  const raw = JSON.parse(String(formData.get("lines") ?? "[]")) as Line[];
  const lines = raw.filter((l) => l.itemId && Number(l.qty) > 0);
  if (!lines.length) throw new Error("Add at least one line");
  return lines.map((l) => ({ itemId: l.itemId, qty: Number(l.qty), rate: Number(l.rate) || 0 }));
}

async function markCustomerOrdered(tx: Prisma.TransactionClient, customerId: string, cycleDays: number) {
  const party = await tx.party.findUnique({ where: { id: customerId } });
  if (!party) return;
  await tx.party.update({
    where: { id: customerId },
    data: {
      lastOrderAt: new Date(),
      nextReorderDate: addDays(new Date(), party.reorderCycleDays || cycleDays || 30),
      lifecycle: party.lifecycle === "PROSPECT" ? "CUSTOMER" : party.lifecycle,
      isActive: true,
    },
  });
}

export async function createSalesOrder(formData: FormData) {
  return runAction(async () => {
  await requireRole(OPS);
  const customerId = requiredString(formData.get("customerId"), "Customer");
  const customer = await prisma.party.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Customer not found");
  const channel = (String(formData.get("channel") || customer.channel || "B2B")) as CustomerChannel;
  const kind = (String(formData.get("kind") || "COMMERCIAL") as SalesOrderKind);
  const promisedRaw = String(formData.get("promisedDate") ?? "");
  const lines = parseLines(formData);

  const so = await withTransaction(async (tx) => {
    const number = await nextNumberTx(tx, "SO");
    return tx.salesOrder.create({
      data: {
        number,
        customerId,
        channel,
        kind,
        date: formDate(formData, "date", "Date"),
        promisedDate: formDateOptional(promisedRaw, "Promised date"),
        notes: String(formData.get("notes") ?? ""),
        lines: {
          create: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })),
        },
      },
    });
  });
  revalidatePath("/sales/orders");
  revalidatePath("/sales/samples");
  return { redirectTo: `/sales/orders/${so.id}` };
  });
}

export async function confirmSalesOrder(id: string) {
  return runAction(async () => {
  await requireRole(OPS);
  const so = await prisma.salesOrder.findUnique({ where: { id }, include: { lines: true } });
  if (!so || so.status !== "DRAFT") throw new Error("Only draft orders can be confirmed");
  await withTransaction(async (tx) => {
    const byItem = new Map<string, number>();
    for (const line of so.lines) byItem.set(line.itemId, (byItem.get(line.itemId) ?? 0) + line.qty);
    await assertFefo(tx, [...byItem].map(([itemId, qty]) => ({ itemId, qty })));
    if (so.kind === "COMMERCIAL") {
      const extra = await invoiceLineTotal(
        tx,
        so.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })),
        so.customerId,
      );
      await assertCreditOk(tx, so.customerId, extra);
    }
    await tx.salesOrder.update({ where: { id }, data: { status: "CONFIRMED" } });
  });
  revalidatePath(`/sales/orders/${id}`);
  revalidatePath("/sales/orders");
  revalidatePath("/dashboard");
  });
}

export async function saveTrialFeedback(id: string, formData: FormData) {
  return runAction(async () => {
  await requireRole(OPS);
  await prisma.salesOrder.update({
    where: { id },
    data: {
      feedbackUseCase: String(formData.get("feedbackUseCase") ?? ""),
      feedbackTaste: String(formData.get("feedbackTaste") ?? ""),
      feedbackSize: String(formData.get("feedbackSize") ?? ""),
      feedbackCoating: String(formData.get("feedbackCoating") ?? ""),
      feedbackKitchenWaste: String(formData.get("feedbackKitchenWaste") ?? ""),
      feedbackNotes: String(formData.get("feedbackNotes") ?? ""),
      feedbackAt: new Date(),
    },
  });
  revalidatePath(`/sales/orders/${id}`);
  revalidatePath("/sales/samples");
  revalidatePath("/dashboard");
  });
}

async function invoiceLineTotal(tx: Prisma.TransactionClient, lines: Line[], customerId: string) {
  const company = await tx.company.findUnique({ where: { id: "default" } });
  const customer = await tx.party.findUnique({ where: { id: customerId } });
  if (!company || !customer) throw new Error("Company or customer missing");
  const interstate = isInterstate(company.stateCode, customer.stateCode);
  const items = await tx.item.findMany({ where: { id: { in: lines.map((l) => l.itemId) } } });
  const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));
  let total = 0;
  for (const line of lines) {
    const item = itemMap[line.itemId];
    if (!item) throw new Error("Item missing");
    total += taxLine({ qty: line.qty, rate: line.rate, gstRate: item.gstRate }, interstate).amount;
  }
  return total;
}

async function buildInvoiceFromLines(
  tx: Prisma.TransactionClient,
  input: {
    customerId: string;
    channel: CustomerChannel;
    kind: SalesOrderKind;
    date: Date;
    promisedDate?: Date | null;
    salesOrderId?: string;
    notes: string;
    lines: Line[];
    confirm: boolean;
    vehicleNo?: string;
  },
) {
  const company = await tx.company.findUnique({ where: { id: "default" } });
  const customer = await tx.party.findUnique({ where: { id: input.customerId } });
  if (!company || !customer) throw new Error("Company or customer missing");
  const interstate = isInterstate(company.stateCode, customer.stateCode);
  const items = await tx.item.findMany({
    where: { id: { in: input.lines.map((l) => l.itemId) } },
  });
  const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));

  if (input.confirm && input.kind === "COMMERCIAL") {
    let extra = 0;
    for (const line of input.lines) {
      const item = itemMap[line.itemId];
      if (!item) throw new Error("Item missing");
      extra += taxLine({ qty: line.qty, rate: line.rate, gstRate: item.gstRate }, interstate).amount;
    }
    await assertCreditOk(tx, input.customerId, extra);
  }

  const number = await nextNumberTx(tx, "INV");
  const invoice = await tx.invoice.create({
    data: {
      number,
      salesOrderId: input.salesOrderId,
      customerId: input.customerId,
      channel: input.channel,
      kind: input.kind,
      date: input.date,
      promisedDate: input.promisedDate ?? null,
      placeOfSupply: customer.state || company.state,
      isInterstate: interstate,
      status: input.confirm ? "CONFIRMED" : "DRAFT",
      notes: input.notes,
    },
  });

  const computed: TaxLine[] = [];
  const lineRows: {
    invoiceId: string;
    itemId: string;
    batchId: string | null;
    qty: number;
    rate: number;
    hsn: string;
    gstRate: number;
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
  }[] = [];
  const picksByLine = input.confirm
    ? await consumeStockLines(
        tx,
        input.lines.map((line) => ({
          itemId: line.itemId,
          qty: line.qty,
          moveType: "SALE" as const,
          refType: "INVOICE",
          refId: invoice.id,
          notes: `INV ${number}`,
        })),
      )
    : [];
  input.lines.forEach((line, index) => {
    const item = itemMap[line.itemId];
    if (!item) throw new Error("Item missing");
    const tax = taxLine({ qty: line.qty, rate: line.rate, gstRate: item.gstRate }, interstate);
    computed.push(tax);
    if (input.confirm) {
      for (const pick of picksByLine[index] ?? []) {
        const pickTax = taxLine({ qty: pick.qty, rate: line.rate, gstRate: item.gstRate }, interstate);
        lineRows.push({
          invoiceId: invoice.id,
          itemId: line.itemId,
          batchId: pick.batchId,
          qty: pick.qty,
          rate: line.rate,
          hsn: item.hsn,
          gstRate: item.gstRate,
          taxable: pickTax.taxable,
          cgst: pickTax.cgst,
          sgst: pickTax.sgst,
          igst: pickTax.igst,
        });
      }
    } else {
      lineRows.push({
        invoiceId: invoice.id,
        itemId: line.itemId,
        batchId: null,
        qty: line.qty,
        rate: line.rate,
        hsn: item.hsn,
        gstRate: item.gstRate,
        taxable: tax.taxable,
        cgst: tax.cgst,
        sgst: tax.sgst,
        igst: tax.igst,
      });
    }
  });
  if (lineRows.length) await tx.invoiceLine.createMany({ data: lineRows });

  const totals = sumTax(computed);
  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      taxable: totals.taxable,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      total: totals.total,
    },
  });

  if (input.confirm) {
    const challanNo = await nextNumberTx(tx, "DC");
    await tx.deliveryChallan.create({
      data: {
        number: challanNo,
        invoiceId: invoice.id,
        date: input.date,
        vehicleNo: input.vehicleNo ?? "",
      },
    });
    if (input.salesOrderId) {
      await tx.salesOrder.update({
        where: { id: input.salesOrderId },
        data: { status: "COMPLETED" },
      });
    }
    if (input.kind === "COMMERCIAL") {
      await markCustomerOrdered(tx, input.customerId, customer.reorderCycleDays);
    }
  }

  return invoice;
}

export async function createInvoiceFromOrder(id: string) {
  return runAction(async () => {
  await requireRole(OPS);
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!so || (so.status !== "CONFIRMED" && so.status !== "COMPLETED")) {
    throw new Error("Confirm the sales order first");
  }
  const existing = await prisma.invoice.findFirst({
    where: { salesOrderId: id, status: { not: "CANCELLED" } },
  });
  if (existing) return { redirectTo: `/sales/invoices/${existing.id}` };

  const invoice = await withTransaction(async (tx) =>
    buildInvoiceFromLines(tx, {
      customerId: so.customerId,
      channel: so.channel,
      kind: so.kind,
      date: startOfTodayIst(),
      promisedDate: so.promisedDate,
      salesOrderId: so.id,
      notes: so.notes,
      lines: so.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })),
      confirm: false,
    }),
  );
  revalidatePath("/sales/invoices");
  return { redirectTo: `/sales/invoices/${invoice.id}` };
  });
}

export async function confirmInvoice(id: string) {
  return runAction(async () => {
  await requireRole(OPS);
  await withTransaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id },
      include: { lines: true, customer: true },
    });
    if (!invoice || invoice.status !== "DRAFT") throw new Error("Only draft invoices can be confirmed");

    await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
    const grouped = new Map<string, { itemId: string; qty: number; rate: number }>();
    for (const line of invoice.lines) {
      const key = `${line.itemId}:${line.rate}`;
      const prev = grouped.get(key);
      if (prev) prev.qty += line.qty;
      else grouped.set(key, { itemId: line.itemId, qty: line.qty, rate: line.rate });
    }

    const company = await tx.company.findUnique({ where: { id: "default" } });
    const customer = invoice.customer;
    if (!company || !customer) throw new Error("Company or customer missing");
    const interstate = isInterstate(company.stateCode, customer.stateCode);
    const items = await tx.item.findMany({
      where: { id: { in: [...new Set([...grouped.values()].map((l) => l.itemId))] } },
    });
    const itemMap = Object.fromEntries(items.map((item) => [item.id, item]));

    if (invoice.kind === "COMMERCIAL") {
      let extra = 0;
      for (const line of grouped.values()) {
        const item = itemMap[line.itemId];
        if (!item) throw new Error("Item missing");
        extra += taxLine({ qty: line.qty, rate: line.rate, gstRate: item.gstRate }, interstate).amount;
      }
      await assertCreditOk(tx, invoice.customerId, extra, id);
    }

    const groupedLines = [...grouped.values()];
    const picksByLine = await consumeStockLines(
      tx,
      groupedLines.map((line) => ({
        itemId: line.itemId,
        qty: line.qty,
        moveType: "SALE" as const,
        refType: "INVOICE",
        refId: invoice.id,
        notes: `INV ${invoice.number}`,
      })),
    );
    const computed: TaxLine[] = [];
    const lineRows: {
      invoiceId: string;
      itemId: string;
      batchId: string;
      qty: number;
      rate: number;
      hsn: string;
      gstRate: number;
      taxable: number;
      cgst: number;
      sgst: number;
      igst: number;
    }[] = [];
    groupedLines.forEach((line, index) => {
      const item = itemMap[line.itemId];
      if (!item) throw new Error("Item missing");
      for (const pick of picksByLine[index] ?? []) {
        const tax = taxLine({ qty: pick.qty, rate: line.rate, gstRate: item.gstRate }, interstate);
        computed.push(tax);
        lineRows.push({
          invoiceId: invoice.id,
          itemId: line.itemId,
          batchId: pick.batchId,
          qty: pick.qty,
          rate: line.rate,
          hsn: item.hsn,
          gstRate: item.gstRate,
          taxable: tax.taxable,
          cgst: tax.cgst,
          sgst: tax.sgst,
          igst: tax.igst,
        });
      }
    });
    if (lineRows.length) await tx.invoiceLine.createMany({ data: lineRows });
    const totals = sumTax(computed);
    await tx.invoice.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        taxable: totals.taxable,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        total: totals.total,
      },
    });
    const challanNo = await nextNumberTx(tx, "DC");
    await tx.deliveryChallan.create({
      data: { number: challanNo, invoiceId: id, date: invoice.date },
    });
    if (invoice.salesOrderId) {
      await tx.salesOrder.update({
        where: { id: invoice.salesOrderId },
        data: { status: "COMPLETED" },
      });
    }
    if (invoice.kind === "COMMERCIAL") {
      await markCustomerOrdered(tx, invoice.customerId, customer.reorderCycleDays);
    }
  });
  revalidatePath(`/sales/invoices/${id}`);
  revalidatePath("/inventory/stock");
  revalidatePath("/dashboard");
  });
}

export async function createCounterSale(formData: FormData) {
  return runAction(async () => {
  await requireRole(OPS);
  const customerId = requiredString(formData.get("customerId"), "Customer");
  const customer = await prisma.party.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Customer not found");
  const lines = parseLines(formData);

  const invoice = await withTransaction(async (tx) =>
    buildInvoiceFromLines(tx, {
      customerId,
      channel: customer.channel ?? "B2C",
      kind: "COMMERCIAL",
      date: formDate(formData, "date", "Date"),
      notes: String(formData.get("notes") ?? ""),
      lines,
      confirm: true,
    }),
  );
  revalidatePath("/sales/invoices");
  return { redirectTo: `/print/invoice/${invoice.id}` };
  });
}

export async function updateSalesOrder(id: string, formData: FormData) {
  return runAction(async () => {
  await requireRole(OPS);
  const so = await prisma.salesOrder.findUnique({ where: { id } });
  if (!so || so.status !== "DRAFT") throw new Error("Only draft orders can be edited");
  const customerId = requiredString(formData.get("customerId"), "Customer");
  const customer = await prisma.party.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Customer not found");
  const channel = (String(formData.get("channel") || customer.channel || "B2B")) as CustomerChannel;
  const kind = String(formData.get("kind") || so.kind) as SalesOrderKind;
  const promisedRaw = String(formData.get("promisedDate") ?? "");
  const lines = parseLines(formData);
  await prisma.$transaction([
    prisma.salesOrderLine.deleteMany({ where: { soId: id } }),
    prisma.salesOrder.update({
      where: { id },
      data: {
        customerId,
        channel,
        kind,
        date: formDate(formData, "date", "Date"),
        promisedDate: formDateOptional(promisedRaw, "Promised date"),
        notes: String(formData.get("notes") ?? ""),
        lines: { create: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })) },
      },
    }),
  ]);
  revalidatePath(`/sales/orders/${id}`);
  revalidatePath("/sales/orders");
  });
}

export async function cancelSalesOrder(id: string) {
  return runAction(async () => {
  await requireRole(OPS);
  const so = await prisma.salesOrder.findUnique({ where: { id } });
  if (!so || (so.status !== "DRAFT" && so.status !== "CONFIRMED")) {
    throw new Error("Only draft or confirmed orders with no invoice can be cancelled");
  }
  if (so.status === "CONFIRMED") {
    const live = await prisma.invoice.count({
      where: { salesOrderId: id, status: { not: "CANCELLED" } },
    });
    if (live > 0) throw new Error("Cancel the invoice before cancelling this order");
  }
  await prisma.salesOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath(`/sales/orders/${id}`);
  revalidatePath("/sales/orders");
  revalidatePath("/dashboard");
  });
}

export async function updateDraftInvoice(id: string, formData: FormData) {
  return runAction(async () => {
  await requireRole(OPS);
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.status !== "DRAFT") throw new Error("Only draft invoices can be edited");
  const lines = parseLines(formData);
  await withTransaction(async (tx) => {
    const company = await tx.company.findUnique({ where: { id: "default" } });
    const customer = await tx.party.findUnique({ where: { id: invoice.customerId } });
    if (!company || !customer) throw new Error("Company or customer missing");
    const interstate = isInterstate(company.stateCode, customer.stateCode);
    await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
    const items = await tx.item.findMany({ where: { id: { in: lines.map((l) => l.itemId) } } });
    const itemMap = Object.fromEntries(items.map((item) => [item.id, item]));
    const computed: TaxLine[] = [];
    const lineRows: {
      invoiceId: string;
      itemId: string;
      qty: number;
      rate: number;
      hsn: string;
      gstRate: number;
      taxable: number;
      cgst: number;
      sgst: number;
      igst: number;
    }[] = [];
    for (const line of lines) {
      const item = itemMap[line.itemId];
      if (!item) throw new Error("Item missing");
      const tax = taxLine({ qty: line.qty, rate: line.rate, gstRate: item.gstRate }, interstate);
      computed.push(tax);
      lineRows.push({
        invoiceId: id,
        itemId: line.itemId,
        qty: line.qty,
        rate: line.rate,
        hsn: item.hsn,
        gstRate: item.gstRate,
        taxable: tax.taxable,
        cgst: tax.cgst,
        sgst: tax.sgst,
        igst: tax.igst,
      });
    }
    if (lineRows.length) await tx.invoiceLine.createMany({ data: lineRows });
    const totals = sumTax(computed);
    await tx.invoice.update({
      where: { id },
      data: {
        taxable: totals.taxable,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        total: totals.total,
        notes: String(formData.get("notes") ?? invoice.notes),
      },
    });
  });
  revalidatePath(`/sales/invoices/${id}`);
  });
}

export async function cancelInvoice(id: string) {
  return runAction(async () => {
  await requireRole(OPS);
  await withTransaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!invoice || (invoice.status !== "DRAFT" && invoice.status !== "CONFIRMED")) {
      throw new Error("This invoice cannot be cancelled");
    }
    if (invoice.status === "CONFIRMED") {
      if (invoice.paid > 0.009) throw new Error("Void the payment before cancelling this invoice");
      await postStockAdjustments(
        tx,
        invoice.lines.flatMap((line) =>
          line.batchId
            ? [{
                itemId: line.itemId,
                batchId: line.batchId,
                qty: line.qty,
                refType: "INVOICE",
                refId: invoice.id,
                notes: `Void ${invoice.number}`,
              }]
            : [],
        ),
      );
      if (invoice.salesOrderId) {
        const so = await tx.salesOrder.findUnique({ where: { id: invoice.salesOrderId } });
        if (so?.status === "COMPLETED") {
          await tx.salesOrder.update({ where: { id: so.id }, data: { status: "CONFIRMED" } });
        }
      }
    }
    await tx.invoice.update({ where: { id }, data: { status: "CANCELLED" } });
  });
  revalidatePath(`/sales/invoices/${id}`);
  revalidatePath("/sales/invoices");
  revalidatePath("/inventory/stock");
  revalidatePath("/dashboard");
  });
}

export async function repeatLastOrder(customerId: string) {
  return runAction(async () => {
  await requireRole(OPS);
  const last = await prisma.salesOrder.findFirst({
    where: { customerId, kind: "COMMERCIAL", status: { not: "CANCELLED" } },
    include: { lines: true, customer: true },
    orderBy: { date: "desc" },
  });
  if (!last || !last.lines.length) throw new Error("No previous commercial order for this customer");
  const so = await withTransaction(async (tx) => {
    const number = await nextNumberTx(tx, "SO");
    return tx.salesOrder.create({
      data: {
        number,
        customerId,
        channel: last.channel,
        kind: "COMMERCIAL",
        date: startOfTodayIst(),
        notes: `Repeat of ${last.number}`,
        lines: {
          create: last.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })),
        },
      },
    });
  });
  revalidatePath("/sales/orders");
  return { redirectTo: `/sales/orders/${so.id}` };
  });
}

export async function repeatFromInvoice(invoiceId: string) {
  return runAction(async () => {
  await requireRole(OPS);
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true },
  });
  if (!inv || !inv.lines.length) throw new Error("Invoice has no lines to repeat");
  const grouped = new Map<string, { itemId: string; qty: number; rate: number }>();
  for (const line of inv.lines) {
    const prev = grouped.get(line.itemId);
    if (prev) prev.qty += line.qty;
    else grouped.set(line.itemId, { itemId: line.itemId, qty: line.qty, rate: line.rate });
  }
  const so = await withTransaction(async (tx) => {
    const number = await nextNumberTx(tx, "SO");
    return tx.salesOrder.create({
      data: {
        number,
        customerId: inv.customerId,
        channel: inv.channel,
        kind: "COMMERCIAL",
        date: startOfTodayIst(),
        notes: `Repeat of ${inv.number}`,
        lines: {
          create: [...grouped.values()].map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })),
        },
      },
    });
  });
  revalidatePath("/sales/orders");
  return { redirectTo: `/sales/orders/${so.id}` };
  });
}

export async function saveDispatchChecklist(id: string, formData: FormData) {
  return runAction(async () => {
  await requireRole(OPS);
  await prisma.deliveryChallan.update({
    where: { id },
    data: {
      vehicleNo: String(formData.get("vehicleNo") ?? ""),
      freezerOk: formData.get("freezerOk") === "on",
      sealOk: formData.get("sealOk") === "on",
      dispatchedAt: (() => {
        const raw = String(formData.get("dispatchedAt") ?? "").trim();
        if (!raw) return new Date();
        const parsed = parseCalendarDateTime(raw);
        if (!parsed) throw new Error("Dispatch time is not a valid date");
        return parsed;
      })(),
      customerFreezerNote: String(formData.get("customerFreezerNote") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    },
  });
  const challan = await prisma.deliveryChallan.findUnique({ where: { id }, select: { invoiceId: true } });
  revalidatePath("/sales/invoices");
  if (challan) revalidatePath(`/sales/invoices/${challan.invoiceId}`);
  revalidatePath("/dashboard");
  });
}
