import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, Empty, Badge } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { ListPager, SortLink } from "@/components/list-pager";
import { parseListQuery } from "@/lib/filters";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage, parseSortDir, parseSortKey } from "@/lib/list-page";
import { addDays, endOfDayIst, formatDate, isExpiredLot, qty, startOfTodayIst } from "@/lib/utils";

const SORT_KEYS = ["lotNo", "expiryDate", "qtyOnHand", "mfgDate"] as const;

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const { q } = parseListQuery(sp);
  const page = parsePage(sp.page);
  const sort = parseSortKey(sp.sort, SORT_KEYS, "expiryDate");
  const dir = parseSortDir(sp.dir === "desc" ? "desc" : sp.sort ? sp.dir : "asc");
  const query = { q, sort, dir, page: String(page) };
  const today = startOfTodayIst();
  const where: Prisma.BatchWhereInput = {
    qtyOnHand: { gt: 0 },
    ...(q
      ? {
          OR: [{ lotNo: { contains: q } }, { item: { name: { contains: q } } }, { item: { sku: { contains: q } } }],
        }
      : {}),
  };

  const [total, batches, expiredAgg] = await Promise.all([
    prisma.batch.count({ where }),
    prisma.batch.findMany({
      where,
      include: { item: true },
      orderBy:
        sort === "expiryDate"
          ? [{ expiryDate: dir }, { item: { name: "asc" } }]
          : ({ [sort]: dir } as Prisma.BatchOrderByWithRelationInput),
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
    prisma.batch.findMany({
      where: { qtyOnHand: { gt: 0 }, expiryDate: { lte: today } },
      select: { qtyOnHand: true },
    }),
  ]);
  const in7 = endOfDayIst(addDays(today, 7));
  const expiredQty = expiredAgg.reduce((s, b) => s + b.qtyOnHand, 0);

  return (
    <div>
      <PageHeader
        title="Batches"
        subtitle={`FEFO skips expired lots. Expired on hand: ${qty(expiredQty)} across ${expiredAgg.length} lots.`}
      />
      <Card className="p-2">
        <ListFilters q={q} placeholder="Lot, SKU or item name" />
        {batches.length === 0 ? (
          <Empty>{q ? `No lots match “${q}”.` : "No lots yet. Confirm a GRN or production batch."}</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Item</Th>
                  <Th>
                    <SortLink
                      basePath="/inventory/batches"
                      query={query}
                      sortKey="lotNo"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Lot
                    </SortLink>
                  </Th>
                  <Th>
                    <SortLink
                      basePath="/inventory/batches"
                      query={query}
                      sortKey="qtyOnHand"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Qty
                    </SortLink>
                  </Th>
                  <Th>
                    <SortLink
                      basePath="/inventory/batches"
                      query={query}
                      sortKey="mfgDate"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Mfg
                    </SortLink>
                  </Th>
                  <Th>
                    <SortLink
                      basePath="/inventory/batches"
                      query={query}
                      sortKey="expiryDate"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Expiry
                    </SortLink>
                  </Th>
                  <Th>Source</Th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const exp = b.expiryDate ? new Date(b.expiryDate) : null;
                  const expired = isExpiredLot(exp, today);
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
            <ListPager basePath="/inventory/batches" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
