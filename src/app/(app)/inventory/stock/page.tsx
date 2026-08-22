import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, Empty, Badge, LinkButton } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { parseListQuery } from "@/lib/filters";
import { qty } from "@/lib/utils";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = parseListQuery(await searchParams);
  const items = await prisma.item.findMany({
    where: {
      isActive: true,
      ...(q
        ? { OR: [{ sku: { contains: q } }, { name: { contains: q } }] }
        : {}),
    },
    include: { batches: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return (
    <div>
      <PageHeader
        title="Stock on hand"
        subtitle="Live qty from batches. Never overwrite — use adjust or documents."
        actions={<LinkButton href="/inventory/adjust" variant="secondary">Adjust / wastage</LinkButton>}
      />
      <Card className="p-2">
        <ListFilters q={q} placeholder="SKU or item name" />
        {items.length === 0 ? (
          <Empty>No items match.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th>Type</Th>
                <Th>On hand</Th>
                <Th>Reorder</Th>
                <Th>Lots</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const onHand = item.batches.reduce((s, b) => s + b.qtyOnHand, 0);
                const low = item.reorderLevel > 0 && onHand <= item.reorderLevel;
                return (
                  <tr key={item.id}>
                    <Td>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted">{item.sku}</div>
                    </Td>
                    <Td>{item.type}</Td>
                    <Td>
                      {qty(onHand, item.unit)} {low ? <Badge tone="warn">Low</Badge> : null}
                    </Td>
                    <Td>{qty(item.reorderLevel, item.unit)}</Td>
                    <Td>
                      <Link href="/inventory/batches" className="text-sm text-saffron">
                        Lots
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
