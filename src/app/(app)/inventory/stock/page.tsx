import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, Empty, Badge, LinkButton } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { ListPager, SortLink } from "@/components/list-pager";
import { UnitConverter } from "@/components/unit-converter";
import { parseListQuery } from "@/lib/filters";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage, parseSortDir, parseSortKey } from "@/lib/list-page";
import { isExpiredLot, qty, startOfTodayIst } from "@/lib/utils";

const SORT_KEYS = ["name", "sku", "type", "reorderLevel"] as const;

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const { q } = parseListQuery(sp);
  const page = parsePage(sp.page);
  const sort = parseSortKey(sp.sort, SORT_KEYS, "name");
  const dir = parseSortDir(sp.dir === "desc" ? "desc" : sp.sort ? sp.dir : "asc");
  const query = { q, sort, dir, page: String(page) };
  const where: Prisma.ItemWhereInput = {
    isActive: true,
    ...(q ? { OR: [{ sku: { contains: q } }, { name: { contains: q } }] } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      include: { batches: true },
      orderBy:
        sort === "name"
          ? [{ type: "asc" }, { name: dir }]
          : ({ [sort]: dir } as Prisma.ItemOrderByWithRelationInput),
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Stock on hand"
        subtitle="Live qty from batches. Never overwrite — use adjust or documents."
        actions={<LinkButton href="/inventory/adjust" variant="secondary">Adjust / wastage</LinkButton>}
      />
      <UnitConverter className="mb-4 p-4 no-print" />
      <Card className="p-2">
        <ListFilters q={q} placeholder="SKU or item name" />
        {items.length === 0 ? (
          <Empty>{q ? `No items match “${q}”.` : "No items yet."}</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>
                    <SortLink
                      basePath="/inventory/stock"
                      query={query}
                      sortKey="name"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Item
                    </SortLink>
                  </Th>
                  <Th>
                    <SortLink
                      basePath="/inventory/stock"
                      query={query}
                      sortKey="type"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Type
                    </SortLink>
                  </Th>
                  <Th>On hand</Th>
                  <Th>
                    <SortLink
                      basePath="/inventory/stock"
                      query={query}
                      sortKey="reorderLevel"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Reorder
                    </SortLink>
                  </Th>
                  <Th>Lots</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const today = startOfTodayIst();
                  const available = item.batches
                    .filter((b) => b.qtyOnHand > 0 && !isExpiredLot(b.expiryDate, today))
                    .reduce((s, b) => s + b.qtyOnHand, 0);
                  const expiredQty = item.batches
                    .filter((b) => b.qtyOnHand > 0 && isExpiredLot(b.expiryDate, today))
                    .reduce((s, b) => s + b.qtyOnHand, 0);
                  const low = item.reorderLevel > 0 && available <= item.reorderLevel;
                  return (
                    <tr key={item.id}>
                      <Td>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted">{item.sku}</div>
                      </Td>
                      <Td>{item.type}</Td>
                      <Td>
                        {qty(available, item.unit)} {low ? <Badge tone="warn">Low</Badge> : null}
                        {expiredQty > 0.0005 ? (
                          <div className="text-xs text-bad">Expired {qty(expiredQty, item.unit)}</div>
                        ) : null}
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
            <ListPager basePath="/inventory/stock" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
