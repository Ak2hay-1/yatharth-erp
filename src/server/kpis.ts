import { prisma } from "@/lib/prisma";
import { addDays, monthBoundsIst, startOfTodayIst } from "@/lib/utils";
import { KPI_TARGETS } from "@/lib/labels";
import { contributionForLines, itemUnitCostMap } from "@/server/costing";

function monthBounds(ref = new Date()) {
  return monthBoundsIst(ref);
}

function pct(num: number, den: number) {
  return den > 0 ? (num / den) * 100 : 0;
}

export async function getMentorKpis(ref = new Date()) {
  const { start, end, key } = monthBounds(ref);
  const today = startOfTodayIst();

  const [
    invoices,
    production,
    wasteMoves,
    complaints,
    parties,
    invoiceStats,
    sampleOrders,
    commercialOrders,
    finishedItems,
    unpaid,
    review,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: "CONFIRMED", date: { gte: start, lte: end } },
      select: {
        id: true,
        kind: true,
        total: true,
        date: true,
        promisedDate: true,
        customerId: true,
        lines: { select: { itemId: true, qty: true, taxable: true } },
        challans: { select: { date: true }, orderBy: { date: "asc" }, take: 1 },
        salesOrder: { select: { promisedDate: true } },
      },
    }),
    prisma.productionBatch.findMany({
      where: { status: { not: "CANCELLED" }, mfgDate: { gte: start, lte: end } },
      select: {
        outputQty: true,
        wastageQty: true,
        rejectQty: true,
        workOrder: {
          select: { plannedQty: true, recipe: { select: { finishedItemId: true } } },
        },
      },
    }),
    prisma.stockMove.findMany({
      where: { type: "WASTE", createdAt: { gte: start, lte: end } },
      select: { qty: true, wasteCause: true, item: { select: { type: true } } },
    }),
    prisma.complaint.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { itemId: true },
    }),
    prisma.party.findMany({
      where: { kind: { in: ["CUSTOMER", "BOTH"] } },
      select: {
        id: true,
        name: true,
        channel: true,
        lifecycle: true,
        createdAt: true,
        reorderCycleDays: true,
        lostReason: true,
      },
    }),
    prisma.invoice.groupBy({
      by: ["customerId"],
      where: { status: "CONFIRMED", kind: "COMMERCIAL" },
      _count: { _all: true },
      _min: { date: true },
      _max: { date: true },
    }),
    prisma.salesOrder.findMany({
      where: { kind: { in: ["SAMPLE", "TRIAL"] }, date: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      select: { customerId: true },
    }),
    prisma.salesOrder.findMany({
      where: { kind: "COMMERCIAL", date: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      select: { id: true },
    }),
    prisma.item.findMany({
      where: { type: "FINISHED", isActive: true },
      select: { id: true, sku: true, name: true, tier: true },
    }),
    prisma.invoice.findMany({
      where: { status: "CONFIRMED", kind: "COMMERCIAL" },
      select: {
        id: true,
        number: true,
        total: true,
        paid: true,
        date: true,
        customerId: true,
        customer: { select: { name: true, paymentTermsDays: true, creditLimit: true } },
      },
    }),
    prisma.monthlyReview.findUnique({ where: { month: key } }),
  ]);

  const commercialInvoices = invoices.filter((i) => i.kind === "COMMERCIAL");
  const salesTotal = commercialInvoices.reduce((s, i) => s + i.total, 0);
  const contrib = await contributionForLines(
    prisma,
    commercialInvoices.flatMap((i) => i.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, taxable: l.taxable }))),
  );

  const planned = production.reduce((s, p) => s + (p.workOrder?.plannedQty ?? 0), 0);
  const good = production.reduce((s, p) => s + p.outputQty, 0);
  const prodWaste = production.reduce((s, p) => s + p.wastageQty, 0);
  const reject = production.reduce((s, p) => s + p.rejectQty, 0);
  const yieldPct = pct(good, planned);
  const rejectionPct = pct(reject, good + reject);
  const freezerReturnWaste = wasteMoves
    .filter((m) => m.item.type === "FINISHED" && (m.wasteCause === "FREEZER" || m.wasteCause === "RETURN"))
    .reduce((s, m) => s + Math.abs(m.qty), 0);
  const wastagePct = pct(prodWaste + freezerReturnWaste, good + prodWaste);

  const otdDenom = commercialInvoices.filter((i) => i.promisedDate || i.salesOrder?.promisedDate);
  const onTime = otdDenom.filter((i) => {
    const promised = i.promisedDate ?? i.salesOrder?.promisedDate;
    const delivered = i.challans[0]?.date ?? i.date;
    if (!promised) return true;
    return delivered.getTime() <= promised.getTime() + 86400000 - 1;
  });
  const onTimePct = otdDenom.length ? pct(onTime.length, otdDenom.length) : 100;

  const complaintPct = pct(complaints.length, commercialInvoices.length);

  const commercialByCustomer = new Map(
    invoiceStats.map((row) => [
      row.customerId,
      { count: row._count._all, first: row._min.date, last: row._max.date },
    ]),
  );
  const b2bCustomers = parties.filter((p) => p.channel === "B2B" && p.lifecycle !== "INACTIVE");
  const withOrders = b2bCustomers.filter((p) => (commercialByCustomer.get(p.id)?.count ?? 0) > 0);
  const repeaters = withOrders.filter((p) => (commercialByCustomer.get(p.id)?.count ?? 0) >= 2);
  const repeatPct = pct(repeaters.length, withOrders.length);

  const newLeads = parties.filter((p) => p.lifecycle === "PROSPECT" && p.createdAt >= start && p.createdAt <= end);
  const newCustomers = parties.filter((p) => {
    if (p.channel !== "B2B") return false;
    const first = commercialByCustomer.get(p.id)?.first;
    return first ? first >= start && first <= end : false;
  });

  const sampleCustomerIds = new Set(sampleOrders.map((o) => o.customerId));
  const converted = [...sampleCustomerIds].filter((id) => {
    const last = commercialByCustomer.get(id)?.last;
    return last ? last >= start : false;
  });

  const unitCosts = await itemUnitCostMap(
    prisma,
    finishedItems.map((item) => item.id),
  );
  const skuRows = finishedItems.map((item) => {
      const lines = commercialInvoices.flatMap((inv) => inv.lines.filter((l) => l.itemId === item.id));
      const qtySold = lines.reduce((s, l) => s + l.qty, 0);
      const revenue = lines.reduce((s, l) => s + l.taxable, 0);
      const unitCost = unitCosts.get(item.id) ?? 0;
      const cost = qtySold * unitCost;
      const contribution = revenue - cost;
      const contributionPct = pct(contribution, revenue);
      const skuProd = production.filter((p) => p.workOrder?.recipe?.finishedItemId === item.id);
      const skuPlanned = skuProd.reduce((s, p) => s + (p.workOrder?.plannedQty ?? 0), 0);
      const skuGood = skuProd.reduce((s, p) => s + p.outputQty, 0);
      const skuYield = pct(skuGood, skuPlanned);
      const buyers = new Set(commercialInvoices.filter((inv) => inv.lines.some((l) => l.itemId === item.id)).map((i) => i.customerId));
      const repeatBuyers = [...buyers].filter((cid) => {
        const count = commercialInvoices.filter((inv) => inv.customerId === cid && inv.lines.some((l) => l.itemId === item.id)).length;
        return count >= 2;
      });
      const skuRepeat = pct(repeatBuyers.length, buyers.size);
      const skuComplaints = complaints.filter((c) => c.itemId === item.id).length;
      const failMargin = revenue > 0 && contributionPct < KPI_TARGETS.contributionPct;
      const failYield = skuPlanned > 0 && skuYield < KPI_TARGETS.yieldPct;
      const failRepeat = buyers.size >= 2 && skuRepeat < KPI_TARGETS.repeatPct;
      return {
        item,
        qtySold,
        revenue,
        unitCost,
        contribution,
        contributionPct,
        yieldPct: skuYield,
        repeatPct: skuRepeat,
        complaints: skuComplaints,
        discontinue: failMargin || failYield || failRepeat,
        reasons: [
          failMargin ? "margin" : null,
          failYield ? "yield" : null,
          failRepeat ? "repeat" : null,
        ].filter(Boolean) as string[],
      };
  });

  const topContribution = [...skuRows].sort((a, b) => b.contribution - a.contribution).slice(0, 5);
  const discontinue = skuRows.filter((s) => s.discontinue && (s.revenue > 0 || s.yieldPct > 0));

  const overdue = unpaid
    .map((i) => {
      const due = i.total - i.paid;
      const terms = i.customer.paymentTermsDays || 30;
      const dueDate = addDays(i.date, terms);
      return { ...i, due, dueDate, overdue: due > 0.009 && dueDate < today };
    })
    .filter((i) => i.due > 0.009);

  const exposureByCustomer = new Map<string, { name: string; due: number; limit: number }>();
  for (const i of overdue) {
    const prev = exposureByCustomer.get(i.customerId) ?? {
      name: i.customer.name,
      due: 0,
      limit: i.customer.creditLimit,
    };
    prev.due += i.due;
    exposureByCustomer.set(i.customerId, prev);
  }
  const overLimit = [...exposureByCustomer.values()].filter((c) => c.limit > 0 && c.due > c.limit);
  const overdueList = overdue.filter((i) => i.overdue);

  const noReorder = parties.filter((p) => {
    if (p.channel !== "B2B") return false;
    const last = commercialByCustomer.get(p.id)?.last;
    if (!last) return false;
    const cycle = p.reorderCycleDays || 30;
    return addDays(last, cycle + 7) < today;
  });

  return {
    monthKey: key,
    start,
    end,
    salesTotal,
    contribution: contrib.contribution,
    contributionPct: contrib.pct,
    cost: contrib.cost,
    yieldPct,
    rejectionPct,
    wastagePct,
    onTimePct,
    complaintPct,
    repeatPct,
    newLeads: newLeads.length,
    newCustomers: newCustomers.length,
    samplesOut: sampleOrders.length,
    sampleConversionPct: pct(converted.length, sampleCustomerIds.size),
    commercialOrders: commercialOrders.length,
    commercialInvoices: commercialInvoices.length,
    complaints,
    sampleOrders,
    topContribution,
    discontinue,
    skuRows,
    overdue: overdueList,
    overLimit,
    noReorder,
    review,
    targets: KPI_TARGETS,
    receivables: overdue.reduce((s, i) => s + i.due, 0),
    payables: 0,
  };
}
