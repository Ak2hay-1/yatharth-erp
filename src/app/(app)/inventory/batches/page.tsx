import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, Empty, Badge } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { parseListQuery } from "@/lib/filters";
import { addDays, formatDate, qty } from "@/lib/utils";

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = parseListQuery(await searchParams);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const batches = await prisma.batch.findMany({
    where: {
      qtyOnHand: { gt: 0 },
      ...(q
        ? {
            OR: [{ lotNo: { contains: q } }, { item: { name: { contains: q } } }, { item: { sku: { contains: q } } }],
          }
        : {}),
    },
    include: { item: true },
    orderBy: [{ expiryDate: "asc" }, { item: { name: "asc" } }],
  });
  const in7 = addDays(today, 7);
  return (
    <div>
      <PageHeader title="Batches" subtitle="FEFO picking uses earliest expiry first." />
      <Card className="p-2">
        <ListFilters q={q} placeholder="Lot, SKU or item name" />
        {batches.length === 0 ? (
          <Empty>No lots match. Confirm a GRN or production batch.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th>Lot</Th>
                <Th>Qty</Th>
                <Th>Mfg</Th>
                <Th>Expiry</Th>
                <Th>Source</Th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => {
                const exp = b.expiryDate ? new Date(b.expiryDate) : null;
                const expired = exp && exp < today;
                const soon = exp && exp <= in7 && !expired;
                return (
                  <tr key={b.id}>
                    <Td>
                      {b.item.name}
                      <div className="text-xs text-muted">{b.item.sku}</div>
                    </Td>
                    <Td className="font-mono text-xs">{b.lotNo}</Td>
                    <Td>{qty(b.qtyOnHand, b.item.unit)}</Td>
                    <Td>{formatDate(b.mfgDate)}</Td>
                    <Td>
                      {formatDate(b.expiryDate)}{" "}
                      {expired ? <Badge tone="bad">Expired</Badge> : null}
                      {soon ? <Badge tone="warn">Soon</Badge> : null}
                    </Td>
                    <Td>{b.source}</Td>
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
