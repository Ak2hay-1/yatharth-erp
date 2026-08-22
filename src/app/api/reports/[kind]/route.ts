import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FINANCE } from "@/lib/permissions";
import { csvResponse, exportStamp } from "@/lib/csv";
import { addDays, formatDate } from "@/lib/utils";
import { getMentorKpis } from "@/server/kpis";
import { labelOf, WASTE_CAUSES } from "@/lib/labels";

export const runtime = "nodejs";

const KINDS = [
  "kpis",
  "discontinue",
  "sales",
  "purchases",
  "production",
  "waste",
  "expiry",
] as const;

type Kind = (typeof KINDS)[number];

function isKind(v: string): v is Kind {
  return (KINDS as readonly string[]).includes(v);
}

export async function GET(_request: Request, context: { params: Promise<{ kind: string }> }) {
  await requireRole(FINANCE);
  const { kind: raw } = await context.params;
  if (!isKind(raw)) {
    return new Response("Unknown report", { status: 404 });
  }
  const stamp = exportStamp();

  if (raw === "kpis") {
    const kpis = await getMentorKpis();
    return csvResponse(`kpis-${kpis.monthKey}-${stamp}.csv`, ["Metric", "Value"], [
      ["Month", kpis.monthKey],
      ["Sales", kpis.salesTotal],
      ["Product cost", kpis.cost],
      ["Contribution", kpis.contribution],
      ["Contribution %", kpis.contributionPct.toFixed(1)],
      ["Receivables", kpis.receivables],
      ["New B2B customers", kpis.newCustomers],
      ["Target new customers", kpis.targets.newCustomersPerMonth],
      ["Yield %", kpis.yieldPct.toFixed(1)],
      ["Rejection %", kpis.rejectionPct.toFixed(1)],
      ["Complaint %", kpis.complaintPct.toFixed(1)],
      ["Repeat %", kpis.repeatPct.toFixed(1)],
      ["Wastage %", kpis.wastagePct.toFixed(1)],
      ["On-time %", kpis.onTimePct.toFixed(1)],
    ]);
  }

  if (raw === "discontinue") {
    const kpis = await getMentorKpis();
    const rows = kpis.skuRows
      .filter((s) => s.revenue > 0 || s.item.tier === "HERO" || s.yieldPct > 0)
      .map((s) => [
        s.item.sku,
        s.item.name,
        s.item.tier,
        s.unitCost,
        s.revenue,
        s.contribution,
        s.contributionPct.toFixed(1),
        s.yieldPct.toFixed(1),
        s.repeatPct.toFixed(1),
        s.discontinue ? "DISCONTINUE" : "OK",
        s.reasons.join("; "),
      ]);
    return csvResponse(`sku-contribution-${stamp}.csv`, [
      "SKU",
      "Name",
      "Tier",
      "Unit cost",
      "Revenue",
      "Contribution",
      "Contribution %",
      "Yield %",
      "Repeat %",
      "Flag",
      "Reasons",
    ], rows);
  }

  if (raw === "sales") {
    const invoices = await prisma.invoice.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { customer: true },
      orderBy: { date: "desc" },
      take: 5000,
    });
    return csvResponse(
      `sales-register-${stamp}.csv`,
      ["Invoice", "Date", "Kind", "Customer", "GSTIN", "Taxable", "CGST", "SGST", "IGST", "Total", "Paid"],
      invoices.map((i) => [
        i.number,
        formatDate(i.date),
        i.kind,
        i.customer.name,
        i.customer.gstin || "B2C",
        i.taxable,
        i.cgst,
        i.sgst,
        i.igst,
        i.total,
        i.paid,
      ]),
    );
  }

  if (raw === "purchases") {
    const bills = await prisma.supplierBill.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { supplier: true },
      orderBy: { date: "desc" },
      take: 5000,
    });
    return csvResponse(
      `purchase-register-${stamp}.csv`,
      ["Bill", "Date", "Supplier", "Taxable", "Tax", "Total", "Paid", "Due"],
      bills.map((b) => [
        b.number,
        formatDate(b.date),
        b.supplier.name,
        b.taxable,
        b.cgst + b.sgst + b.igst,
        b.total,
        b.paid,
        b.total - b.paid,
      ]),
    );
  }

  if (raw === "production") {
    const production = await prisma.productionBatch.findMany({
      include: { workOrder: { include: { recipe: { include: { finishedItem: true } } } } },
      orderBy: { mfgDate: "desc" },
      take: 5000,
    });
    return csvResponse(
      `production-${stamp}.csv`,
      ["Batch", "Date", "Product", "SKU", "Good", "Waste", "Reject", "Yield %", "Unit cost", "Total cost"],
      production.map((p) => {
        const planned = p.workOrder.plannedQty;
        const y = planned > 0 ? Math.round((p.outputQty / planned) * 1000) / 10 : 0;
        return [
          p.number,
          formatDate(p.mfgDate),
          p.workOrder.recipe.finishedItem.name,
          p.workOrder.recipe.finishedItem.sku,
          p.outputQty,
          p.wastageQty,
          p.rejectQty,
          y,
          p.unitCost,
          p.totalCost,
        ];
      }),
    );
  }

  if (raw === "waste") {
    const wasteMoves = await prisma.stockMove.findMany({
      where: { type: "WASTE" },
      include: { item: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    return csvResponse(
      `wastage-${stamp}.csv`,
      ["When", "Item", "SKU", "Cause", "Qty", "Unit", "Notes"],
      wasteMoves.map((m) => [
        formatDate(m.createdAt),
        m.item.name,
        m.item.sku,
        labelOf(WASTE_CAUSES, m.wasteCause ?? "OTHER"),
        Math.abs(m.qty),
        m.item.unit,
        m.notes,
      ]),
    );
  }

  // expiry
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const in30 = addDays(start, 30);
  const batches = await prisma.batch.findMany({
    where: { qtyOnHand: { gt: 0 }, expiryDate: { lte: in30 } },
    include: { item: true },
    orderBy: { expiryDate: "asc" },
  });
  return csvResponse(
    `expiry-30d-${stamp}.csv`,
    ["Item", "SKU", "Lot", "Qty", "Unit", "Expiry"],
    batches.map((b) => [
      b.item.name,
      b.item.sku,
      b.lotNo,
      b.qtyOnHand,
      b.item.unit,
      formatDate(b.expiryDate),
    ]),
  );
}
