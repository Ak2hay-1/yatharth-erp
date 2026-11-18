import Link from "next/link";
import type { DocStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, LinkButton, StatusBadge, Empty } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { ListPager, SortLink } from "@/components/list-pager";
import { dateRange, parseListQuery } from "@/lib/filters";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage, parseSortDir, parseSortKey } from "@/lib/list-page";
import { formatDate } from "@/lib/utils";
import { labelOf, ORDER_KINDS } from "@/lib/labels";

const SORT_KEYS = ["number", "date", "createdAt"] as const;

export default async function SalesOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const { q, status, from, to } = parseListQuery(sp);
  const page = parsePage(sp.page);
  const sort = parseSortKey(sp.sort, SORT_KEYS, "createdAt");
  const dir = parseSortDir(sp.dir);
  const query = { q, status, from, to, sort, dir, page: String(page) };
  const range = dateRange(from, to);
  const where: Prisma.SalesOrderWhereInput = {
    ...(status ? { status: status as DocStatus } : {}),
    ...(range ? { date: range } : {}),
    ...(q
      ? {
          OR: [{ number: { contains: q } }, { customer: { name: { contains: q } } }],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.salesOrder.count({ where }),
    prisma.salesOrder.findMany({
      where,
      include: { customer: true, lines: true },
      orderBy: { [sort]: dir } as Prisma.SalesOrderOrderByWithRelationInput,
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Sales orders"
        subtitle="B2B commercial, sample and trial orders."
        actions={<LinkButton href="/sales/orders/new">New order</LinkButton>}
      />
      <Card className="p-2">
        <ListFilters q={q} status={status} from={from} to={to} showStatus showDates placeholder="SO number or customer" />
        {rows.length === 0 ? (
          <Empty>No sales orders match.</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>
                    <SortLink
                      basePath="/sales/orders"
                      query={query}
                      sortKey="number"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Number
                    </SortLink>
                  </Th>
                  <Th>Customer</Th>
                  <Th>Kind</Th>
                  <Th>
                    <SortLink basePath="/sales/orders" query={query} sortKey="date" currentSort={sort} currentDir={dir}>
                      Date
                    </SortLink>
                  </Th>
                  <Th>Promised</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <Link href={`/sales/orders/${r.id}`} className="font-medium hover:text-saffron">
                        {r.number}
                      </Link>
                    </Td>
                    <Td>{r.customer.name}</Td>
                    <Td>{labelOf(ORDER_KINDS, r.kind)}</Td>
                    <Td>{formatDate(r.date)}</Td>
                    <Td>{formatDate(r.promisedDate)}</Td>
                    <Td>
                      <StatusBadge status={r.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPager basePath="/sales/orders" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
