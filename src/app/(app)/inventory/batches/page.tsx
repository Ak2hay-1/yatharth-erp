import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, Empty, Badge } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { parseListQuery } from "@/lib/filters";
import { addDays, endOfDayIst, formatDate, qty, startOfTodayIst } from "@/lib/utils";

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = parseListQuery(await searchParams);
  const today = startOfTodayIst();
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
  const in7 = endOfDayIst(addDays(today, 7));
  const expiredLots = batches.filter((b) => b.expiryDate && b.expiryDate < today);
  const expiredQty = expiredLots.reduce((s, b) => s + b.qtyOnHand, 0);
  return (
    <div>
      <PageHeader
        title="Batches"
        subtitle={`FEFO skips expired lots. Expired on hand: ${qty(expiredQty)} across ${expiredLots.length} lots.`}
      />
      <Card className="p-2">
        <ListFilters q={q} placeholder="Lot, SKU or item name" />
        {batches.length === 0 ? (
          <Empty>{q ? `No lots match “${q}”.` : "No lots yet. Confirm a GRN or production batch."}</Empty>
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
