"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CustomerChannel, Prisma, SalesOrderKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OPS } from "@/lib/permissions";
import { addDays, requiredString } from "@/lib/utils";
import { isInterstate, sumTax, taxLine } from "@/lib/gst";
import { nextNumberTx } from "@/server/numbers";
import { consumeStock } from "@/server/stock";
import { assertCreditOk } from "@/server/credit";

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
  await requireRole(OPS);
  const customerId = requiredString(formData.get("customerId"), "Customer");
  const customer = await prisma.party.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Customer not found");
  const channel = (String(formData.get("channel") || customer.channel || "B2B")) as CustomerChannel;
  const kind = (String(formData.get("kind") || "COMMERCIAL") as SalesOrderKind);
  const promisedRaw = String(formData.get("promisedDate") ?? "");
  const lines = parseLines(formData);

  const so = await prisma.$transaction(async (tx) => {
    const number = await nextNumberTx(tx, "SO");
    return tx.salesOrder.create({
      data: {
        number,
        customerId,
        channel,
        kind,
        date: new Date(requiredString(formData.get("date"), "Date")),
        promisedDate: promisedRaw ? new Date(promisedRaw) : null,
        notes: String(formData.get("notes") ?? ""),
        lines: {
          create: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })),
        },
      },
    });
  });
  revalidatePath("/sales/orders");
  revalidatePath("/sales/samples");
  redirect(`/sales/orders/${so.id}`);
}

export async function confirmSalesOrder(id: string) {
  await requireRole(OPS);
  const so = await prisma.salesOrder.findUnique({ where: { id }, include: { lines: true } });
  if (!so || so.status !== "DRAFT") throw new Error("Only draft orders can be confirmed");
  await prisma.salesOrder.update({ where: { id }, data: { status: "CONFIRMED" } });
  revalidatePath(`/sales/orders/${id}`);
}

export async function saveTrialFeedback(id: string, formData: FormData) {
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
    const extra = await invoiceLineTotal(tx, input.lines, input.customerId);
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

  const computed = [];
  for (const line of input.lines) {
    const item = itemMap[line.itemId];
    if (!item) throw new Error("Item missing");
    const tax = taxLine({ qty: line.qty, rate: line.rate, gstRate: item.gstRate }, interstate);
    let batchId: string | null = null;
    if (input.confirm) {
      const picks = await consumeStock(tx, {
        itemId: line.itemId,
        qty: line.qty,
        moveType: "SALE",
        refType: "INVOICE",
        refId: invoice.id,
        notes: `INV ${number}`,
      });
      batchId = picks[0]?.batchId ?? null;
      for (const pick of picks) {
        await tx.invoiceLine.create({
          data: {
            invoiceId: invoice.id,
            itemId: line.itemId,
            batchId: pick.batchId,
            qty: pick.qty,
            rate: line.rate,
            hsn: item.hsn,
            gstRate: item.gstRate,
            taxable: taxLine({ qty: pick.qty, rate: line.rate, gstRate: item.gstRate }, interstate).taxable,
            cgst: taxLine({ qty: pick.qty, rate: line.rate, gstRate: item.gstRate }, interstate).cgst,
            sgst: taxLine({ qty: pick.qty, rate: line.rate, gstRate: item.gstRate }, interstate).sgst,
            igst: taxLine({ qty: pick.qty, rate: line.rate, gstRate: item.gstRate }, interstate).igst,
          },
        });
      }
    } else {
      await tx.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          itemId: line.itemId,
          batchId,
          qty: line.qty,
          rate: line.rate,
          hsn: item.hsn,
          gstRate: item.gstRate,
          taxable: tax.taxable,
          cgst: tax.cgst,
          sgst: tax.sgst,
          igst: tax.igst,
        },
      });
    }
    computed.push(tax);
  }

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
  await requireRole(OPS);
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!so || (so.status !== "CONFIRMED" && so.status !== "COMPLETED")) {
    throw new Error("Confirm the sales order first");
  }
  const existing = await prisma.invoice.findFirst({ where: { salesOrderId: id } });
  if (existing) redirect(`/sales/invoices/${existing.id}`);

  const invoice = await prisma.$transaction(async (tx) =>
    buildInvoiceFromLines(tx, {
      customerId: so.customerId,
      channel: so.channel,
      kind: so.kind,
      date: new Date(),
      promisedDate: so.promisedDate,
      salesOrderId: so.id,
      notes: so.notes,
      lines: so.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })),
      confirm: false,
    }),
  );
  revalidatePath("/sales/invoices");
  redirect(`/sales/invoices/${invoice.id}`);
}

export async function confirmInvoice(id: string) {
  await requireRole(OPS);
  await prisma.$transaction(async (tx) => {
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

    if (invoice.kind === "COMMERCIAL") {
      const extra = await invoiceLineTotal(tx, [...grouped.values()], invoice.customerId);
      await assertCreditOk(tx, invoice.customerId, extra, id);
    }

    const company = await tx.company.findUnique({ where: { id: "default" } });
    const customer = invoice.customer;
    if (!company || !customer) throw new Error("Company or customer missing");
    const interstate = isInterstate(company.stateCode, customer.stateCode);

    const computed = [];
    for (const line of grouped.values()) {
      const item = await tx.item.findUnique({ where: { id: line.itemId } });
      if (!item) throw new Error("Item missing");
      const picks = await consumeStock(tx, {
        itemId: line.itemId,
        qty: line.qty,
        moveType: "SALE",
        refType: "INVOICE",
        refId: invoice.id,
        notes: `INV ${invoice.number}`,
      });
      for (const pick of picks) {
        const tax = taxLine({ qty: pick.qty, rate: line.rate, gstRate: item.gstRate }, interstate);
        computed.push(tax);
        await tx.invoiceLine.create({
          data: {
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
          },
        });
      }
    }
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
}

export async function createCounterSale(formData: FormData) {
  await requireRole(OPS);
  const customerId = requiredString(formData.get("customerId"), "Customer");
  const customer = await prisma.party.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Customer not found");
  const lines = parseLines(formData);

  const invoice = await prisma.$transaction(async (tx) =>
    buildInvoiceFromLines(tx, {
      customerId,
      channel: "B2C",
      kind: "COMMERCIAL",
      date: new Date(requiredString(formData.get("date"), "Date")),
      notes: String(formData.get("notes") ?? ""),
      lines,
      confirm: true,
    }),
  );
  revalidatePath("/sales/invoices");
  redirect(`/print/invoice/${invoice.id}`);
}

export async function updateSalesOrder(id: string, formData: FormData) {
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
        date: new Date(requiredString(formData.get("date"), "Date")),
        promisedDate: promisedRaw ? new Date(promisedRaw) : null,
        notes: String(formData.get("notes") ?? ""),
        lines: { create: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })) },
      },
    }),
  ]);
  revalidatePath(`/sales/orders/${id}`);
  revalidatePath("/sales/orders");
}

export async function cancelSalesOrder(id: string) {
  await requireRole(OPS);
  const so = await prisma.salesOrder.findUnique({ where: { id } });
  if (!so || so.status !== "DRAFT") throw new Error("Only draft orders can be cancelled");
  await prisma.salesOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath(`/sales/orders/${id}`);
  revalidatePath("/sales/orders");
}

export async function updateDraftInvoice(id: string, formData: FormData) {
  await requireRole(OPS);
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.status !== "DRAFT") throw new Error("Only draft invoices can be edited");
  const lines = parseLines(formData);
  await prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({ where: { id: "default" } });
    const customer = await tx.party.findUnique({ where: { id: invoice.customerId } });
    if (!company || !customer) throw new Error("Company or customer missing");
    const interstate = isInterstate(company.stateCode, customer.stateCode);
    await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
    const computed = [];
    for (const line of lines) {
      const item = await tx.item.findUnique({ where: { id: line.itemId } });
      if (!item) throw new Error("Item missing");
      const tax = taxLine({ qty: line.qty, rate: line.rate, gstRate: item.gstRate }, interstate);
      computed.push(tax);
      await tx.invoiceLine.create({
        data: {
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
        },
      });
    }
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
}

export async function cancelInvoice(id: string) {
  await requireRole(OPS);
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.status !== "DRAFT") throw new Error("Only draft invoices can be cancelled");
  await prisma.invoice.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath(`/sales/invoices/${id}`);
  revalidatePath("/sales/invoices");
}

export async function repeatLastOrder(customerId: string) {
  await requireRole(OPS);
  const last = await prisma.salesOrder.findFirst({
    where: { customerId, kind: "COMMERCIAL", status: { not: "CANCELLED" } },
    include: { lines: true, customer: true },
    orderBy: { date: "desc" },
  });
  if (!last || !last.lines.length) throw new Error("No previous commercial order for this customer");
  const so = await prisma.$transaction(async (tx) => {
    const number = await nextNumberTx(tx, "SO");
    return tx.salesOrder.create({
      data: {
        number,
        customerId,
        channel: last.channel,
        kind: "COMMERCIAL",
        date: new Date(),
        notes: `Repeat of ${last.number}`,
        lines: {
          create: last.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })),
        },
      },
    });
  });
  revalidatePath("/sales/orders");
  redirect(`/sales/orders/${so.id}`);
}

export async function repeatFromInvoice(invoiceId: string) {
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
  const so = await prisma.$transaction(async (tx) => {
    const number = await nextNumberTx(tx, "SO");
    return tx.salesOrder.create({
      data: {
        number,
        customerId: inv.customerId,
        channel: inv.channel,
        kind: "COMMERCIAL",
        date: new Date(),
        notes: `Repeat of ${inv.number}`,
        lines: {
          create: [...grouped.values()].map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate })),
        },
      },
    });
  });
  revalidatePath("/sales/orders");
  redirect(`/sales/orders/${so.id}`);
}

export async function saveDispatchChecklist(id: string, formData: FormData) {
  await requireRole(OPS);
  await prisma.deliveryChallan.update({
    where: { id },
    data: {
      vehicleNo: String(formData.get("vehicleNo") ?? ""),
      freezerOk: formData.get("freezerOk") === "on",
      sealOk: formData.get("sealOk") === "on",
      dispatchedAt: formData.get("dispatchedAt") ? new Date(String(formData.get("dispatchedAt"))) : new Date(),
      customerFreezerNote: String(formData.get("customerFreezerNote") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    },
  });
  revalidatePath("/sales/invoices");
  revalidatePath("/dashboard");
}
