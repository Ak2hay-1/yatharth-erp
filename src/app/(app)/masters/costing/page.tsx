import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FINANCE, MANAGEMENT, can } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, Empty } from "@/components/ui";
import { money } from "@/lib/utils";

export default async function CostingListPage() {
  const user = await requireRole(FINANCE);
  const canEdit = can(user.role, MANAGEMENT);
  const items = await prisma.item.findMany({
    where: { type: "FINISHED", isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Product costing"
        subtitle="Manufacturing cost, Unit Selling Price (USP), and channel rates from configurable markups."
      />
      <Card className="p-2">
        {items.length === 0 ? (
          <Empty>No finished goods yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>SKU</Th>
                <Th>Mfg cost</Th>
                <Th>USP</Th>
                <Th>B2B</Th>
                <Th>Wholesale</Th>
                <Th>Distributor</Th>
                <Th>MRP</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <Td>
                    <div className="font-medium">{i.name}</div>
                    <div className="font-mono text-xs text-muted">{i.sku}</div>
                  </Td>
                  <Td>{money(i.mfgCost)}</Td>
                  <Td>{money(i.usp)}</Td>
                  <Td>{money(i.rateB2b)}</Td>
                  <Td>{money(i.rateWholesale)}</Td>
                  <Td>{money(i.rateDistributor)}</Td>
                  <Td>{money(i.rateMrp)}</Td>
                  <Td>
                    <Link href={`/masters/costing/${i.id}`} className="text-sm font-semibold text-saffron hover:underline">
                      {canEdit ? "Edit" : "View"}
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
