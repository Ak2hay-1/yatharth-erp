import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can, MANAGEMENT } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, LinkButton, Badge, Empty } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { parseListQuery } from "@/lib/filters";
import { labelOf, PACK_TYPES, PRODUCT_LANES, SKU_TIERS } from "@/lib/labels";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const canManage = can(user.role, MANAGEMENT);
  const { q } = parseListQuery(await searchParams);
  const items = await prisma.item.findMany({
    where: q
      ? {
          OR: [
            { sku: { contains: q } },
            { name: { contains: q } },
            { hsn: { contains: q } },
          ],
        }
      : undefined,
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return (
    <div>
      <PageHeader
        title="Items"
        subtitle="Raw materials, packing and finished SKUs. Hero / core / custom for finished goods."
        actions={canManage ? <LinkButton href="/masters/items/new">New item</LinkButton> : undefined}
      />
      <Card className="p-2">
        <ListFilters q={q} placeholder="SKU, name or HSN" />
        {items.length === 0 ? (
          <Empty>No items match.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>SKU</Th>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Lane</Th>
                <Th>Tier</Th>
                <Th>Pack</Th>
                <Th>GST</Th>
                <Th>Sell</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <Td>
                    {canManage ? (
                      <Link href={`/masters/items/${item.id}`} className="font-medium hover:text-saffron">
                        {item.sku}
                      </Link>
                    ) : (
                      <span className="font-medium">{item.sku}</span>
                    )}
                  </Td>
                  <Td>{item.name}</Td>
                  <Td>
                    <Badge>{item.type}</Badge>
                  </Td>
                  <Td>{labelOf(PRODUCT_LANES, item.lane)}</Td>
                  <Td>{labelOf(SKU_TIERS, item.tier)}</Td>
                  <Td>{item.packSize || labelOf(PACK_TYPES, item.packType)}</Td>
                  <Td>{item.gstRate}%</Td>
                  <Td>{item.sellingPrice}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
