import { Card, PageHeader } from "@/components/ui";
import { CounterSaleForm } from "@/components/counter-sale-form";
import { createCounterSale } from "@/server/sales";
import { getStockHints } from "@/server/stock";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT, OPS, can } from "@/lib/permissions";

export default async function CounterSalePage() {
  const user = await requireRole(OPS);
  const canManage = can(user.role, MANAGEMENT);
  const [customers, items, stockHints] = await Promise.all([
    prisma.party.findMany({
      where: { isActive: true, kind: { in: ["CUSTOMER", "BOTH"] }, channel: "B2C" },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: { isActive: true, type: "FINISHED" },
      orderBy: { name: "asc" },
    }),
    getStockHints(),
  ]);
  return (
    <div>
      <PageHeader
        title="Counter / phone sale"
        subtitle="Immediate GST invoice. Stock is issued by FEFO on save. Press F9 to bill."
      />
      <Card className="p-6">
        <CounterSaleForm
          customers={customers}
          items={items}
          stockHints={stockHints}
          action={createCounterSale}
          canCreate={canManage}
        />
      </Card>
    </div>
  );
}
