import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, LinkButton, StatusBadge, Empty } from "@/components/ui";
import { ListPager, SortLink } from "@/components/list-pager";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage, parseSortDir, parseSortKey } from "@/lib/list-page";
import { formatDate, qty } from "@/lib/utils";

const SORT_KEYS = ["number", "date", "plannedQty", "createdAt"] as const;

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const sort = parseSortKey(sp.sort, SORT_KEYS, "createdAt");
  const dir = parseSortDir(sp.dir);
  const query = { sort, dir, page: String(page) };

  const [total, rows] = await Promise.all([
    prisma.workOrder.count(),
    prisma.workOrder.findMany({
      include: { recipe: { include: { finishedItem: true } }, batches: true },
      orderBy: { [sort]: dir } as Prisma.WorkOrderOrderByWithRelationInput,
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Work orders"
        subtitle="Plan a batch, start it, then complete it. Raw materials are consumed by FEFO."
        actions={<LinkButton href="/production/orders/new">New work order</LinkButton>}
      />
      <Card className="p-2">
        {rows.length === 0 ? (
          <Empty>No work orders.</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>
                    <SortLink
                      basePath="/production/orders"
                      query={query}
                      sortKey="number"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Number
                    </SortLink>
                  </Th>
                  <Th>Product</Th>
                  <Th>
                    <SortLink
                      basePath="/production/orders"
                      query={query}
                      sortKey="plannedQty"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Planned
                    </SortLink>
                  </Th>
                  <Th>
                    <SortLink
                      basePath="/production/orders"
                      query={query}
                      sortKey="date"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Date
                    </SortLink>
                  </Th>
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
                      <StatusBadge status={r.status} label={r.status === "CONFIRMED" ? "In progress" : undefined} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPager basePath="/production/orders" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
