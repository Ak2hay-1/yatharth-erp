import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, LinkButton, StatusBadge, Empty } from "@/components/ui";
import { formatDate, qty } from "@/lib/utils";

export default async function WorkOrdersPage() {
  const rows = await prisma.workOrder.findMany({
    include: { recipe: { include: { finishedItem: true } }, batches: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader
        title="Work orders"
        subtitle="Plan a batch, then produce and consume the recipe by FEFO."
        actions={<LinkButton href="/production/orders/new">New work order</LinkButton>}
      />
      <Card className="p-2">
        {rows.length === 0 ? (
          <Empty>No work orders.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Product</Th>
                <Th>Planned</Th>
                <Th>Date</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <Link href={`/production/orders/${r.id}`} className="font-medium hover:text-saffron">
                      {r.number}
                    </Link>
                  </Td>
                  <Td>{r.recipe.finishedItem.name}</Td>
                  <Td>{qty(r.plannedQty, r.recipe.finishedItem.unit)}</Td>
                  <Td>{formatDate(r.date)}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
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
