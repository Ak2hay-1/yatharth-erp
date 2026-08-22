import { prisma } from "@/lib/prisma";
import { addDays } from "@/lib/utils";

export async function getDashboard() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const in7 = addDays(start, 7);
  const in30 = addDays(start, 30);

  const [
    todayInvoices,
    unpaidInvoices,
    unpaidBills,
    todayProduction,
    lowStock,
    expiring7,
    expiring30,
    recentMoves,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { date: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.invoice.findMany({
      where: { status: "CONFIRMED" },
      include: { customer: true },
      orderBy: { date: "desc" },
    }),
    prisma.supplierBill.findMany({
      where: { status: "CONFIRMED" },
      include: { supplier: true },
      orderBy: { date: "desc" },
    }),
    prisma.productionBatch.aggregate({
      where: { mfgDate: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      _sum: { outputQty: true },
      _count: true,
    }),
    prisma.item.findMany({
      where: { isActive: true, reorderLevel: { gt: 0 } },
      include: { batches: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: {
        qtyOnHand: { gt: 0 },
        expiryDate: { gte: start, lte: in7 },
      },
      include: { item: true },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.batch.findMany({
      where: {
        qtyOnHand: { gt: 0 },
        expiryDate: { gte: start, lte: in30 },
      },
      include: { item: true },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.stockMove.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      include: { item: true, batch: true },
    }),
  ]);

  const receivable = unpaidInvoices
    .map((i) => ({ ...i, due: i.total - i.paid }))
    .filter((i) => i.due > 0.009);
  const payable = unpaidBills
    .map((b) => ({ ...b, due: b.total - b.paid }))
    .filter((b) => b.due > 0.009);

  const low = lowStock
    .map((item) => ({
      item,
      onHand: item.batches.reduce((s, b) => s + b.qtyOnHand, 0),
    }))
    .filter((x) => x.onHand <= x.item.reorderLevel);

  return {
    todaySales: todayInvoices._sum.total ?? 0,
    todayInvoiceCount: todayInvoices._count,
    todayProductionQty: todayProduction._sum.outputQty ?? 0,
    todayProductionCount: todayProduction._count,
    receivable,
    payable,
    low,
    expiring7,
    expiring30,
    recentMoves,
  };
}
