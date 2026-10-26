import { prisma } from "@/lib/prisma";
import { addDays, endOfDayIst, startOfTodayIst } from "@/lib/utils";
import { availableLotWhere } from "@/server/stock";

export async function getDashboard() {
  const start = startOfTodayIst();
  const end = endOfDayIst(start);
  const in7 = endOfDayIst(addDays(start, 7));
  const in30 = endOfDayIst(addDays(start, 30));
  const expiredWhere = { qtyOnHand: { gt: 0 }, expiryDate: { lte: end } };

  const [todayInvoices, expiredLots, expiredCount, todayProduction, lowItems, onHandRows, expiring7, expiring30] =
    await Promise.all([
      prisma.invoice.aggregate({
        where: { date: { gte: start, lte: end }, status: "CONFIRMED" },
        _sum: { total: true },
        _count: true,
      }),
      prisma.batch.findMany({
        where: expiredWhere,
        select: {
          id: true,
          lotNo: true,
          qtyOnHand: true,
          expiryDate: true,
          item: { select: { name: true, unit: true } },
        },
        orderBy: { expiryDate: "asc" },
        take: 12,
      }),
      prisma.batch.count({ where: expiredWhere }),
      prisma.productionBatch.aggregate({
        where: { mfgDate: { gte: start, lte: end }, status: { not: "CANCELLED" } },
        _sum: { outputQty: true },
        _count: true,
      }),
      prisma.item.findMany({
        where: { isActive: true, reorderLevel: { gt: 0 } },
        select: { id: true, name: true, unit: true, reorderLevel: true },
        orderBy: { name: "asc" },
      }),
      prisma.batch.groupBy({
        by: ["itemId"],
        where: availableLotWhere(start),
        _sum: { qtyOnHand: true },
      }),
      prisma.batch.findMany({
        where: {
          qtyOnHand: { gt: 0 },
          expiryDate: { gt: end, lte: in7 },
        },
        select: {
          id: true,
          lotNo: true,
          qtyOnHand: true,
          expiryDate: true,
          item: { select: { name: true, unit: true } },
        },
        orderBy: { expiryDate: "asc" },
        take: 50,
      }),
      prisma.batch.findMany({
        where: {
          qtyOnHand: { gt: 0 },
          expiryDate: { gt: end, lte: in30 },
        },
        select: {
          id: true,
          lotNo: true,
          qtyOnHand: true,
          expiryDate: true,
          item: { select: { name: true, unit: true } },
        },
        orderBy: { expiryDate: "asc" },
        take: 50,
      }),
    ]);

  const onHand = new Map(onHandRows.map((row) => [row.itemId, row._sum.qtyOnHand ?? 0]));
  const low = lowItems
    .map((item) => ({ item, onHand: onHand.get(item.id) ?? 0 }))
    .filter((row) => row.onHand <= row.item.reorderLevel);

  return {
    todaySales: todayInvoices._sum.total ?? 0,
    todayInvoiceCount: todayInvoices._count,
    todayProductionQty: todayProduction._sum.outputQty ?? 0,
    todayProductionCount: todayProduction._count,
    low,
    expiring7,
    expiring30,
    expired: expiredLots,
    expiredCount,
  };
}
