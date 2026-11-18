import Link from "next/link";
import type { DocStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, LinkButton, StatusBadge, Empty } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { ListPager, SortLink } from "@/components/list-pager";
import { dateRange, parseListQuery } from "@/lib/filters";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage, parseSortDir, parseSortKey } from "@/lib/list-page";
import { formatDate } from "@/lib/utils";

const SORT_KEYS = ["number", "date", "createdAt"] as const;

export default async function GrnListPage({
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
  const where: Prisma.GoodsReceiptWhereInput = {
    ...(status ? { status: status as DocStatus } : {}),
    ...(range ? { date: range } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q } },
            { po: { number: { contains: q } } },
            { po: { supplier: { name: { contains: q } } } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.goodsReceipt.count({ where }),
    prisma.goodsReceipt.findMany({
      where,
      include: { po: { include: { supplier: true } } },
      orderBy: { [sort]: dir } as Prisma.GoodsReceiptOrderByWithRelationInput,
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return (
    <div>
      <PageHeader title="Goods receipts" actions={<LinkButton href="/purchase/grn/new">New GRN</LinkButton>} />
      <Card className="p-2">
        <ListFilters q={q} status={status} from={from} to={to} showStatus showDates placeholder="GRN, PO or supplier" />
        {rows.length === 0 ? (
          <Empty>No GRNs match.</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>
                    <SortLink basePath="/purchase/grn" query={query} sortKey="number" currentSort={sort} currentDir={dir}>
                      Number
                    </SortLink>
                  </Th>
                  <Th>PO</Th>
                  <Th>Supplier</Th>
                  <Th>
                    <SortLink basePath="/purchase/grn" query={query} sortKey="date" currentSort={sort} currentDir={dir}>
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
                      <Link href={`/purchase/grn/${r.id}`} className="font-medium hover:text-saffron">
                        {r.number}
                      </Link>
                    </Td>
                    <Td>{r.po.number}</Td>
                    <Td>{r.po.supplier.name}</Td>
                    <Td>{formatDate(r.date)}</Td>
                    <Td>
                      <StatusBadge status={r.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPager basePath="/purchase/grn" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
