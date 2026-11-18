import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FINANCE } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, Empty, StatusBadge } from "@/components/ui";
import { ListPager, SortLink } from "@/components/list-pager";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage, parseSortDir, parseSortKey } from "@/lib/list-page";
import { formatDate, money } from "@/lib/utils";

const SORT_KEYS = ["number", "date", "total", "paid"] as const;

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string }>;
}) {
  await requireRole(FINANCE);
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const sort = parseSortKey(sp.sort, SORT_KEYS, "date");
  const dir = parseSortDir(sp.dir === "asc" ? "asc" : sp.sort ? sp.dir : "desc");
  const query = { sort, dir, page: String(page) };
  const orderBy = { [sort]: dir } as Prisma.SupplierBillOrderByWithRelationInput;

  const [total, rows] = await Promise.all([
    prisma.supplierBill.count(),
    prisma.supplierBill.findMany({
      include: { supplier: true },
      orderBy,
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return (
    <div>
      <PageHeader title="Supplier bills" subtitle="GST purchase register." />
      <Card className="p-2">
        {rows.length === 0 ? (
          <Empty>Create a bill from a confirmed GRN.</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>
                    <SortLink basePath="/purchase/bills" query={query} sortKey="number" currentSort={sort} currentDir={dir}>
                      Number
                    </SortLink>
                  </Th>
                  <Th>Supplier</Th>
                  <Th>
                    <SortLink basePath="/purchase/bills" query={query} sortKey="date" currentSort={sort} currentDir={dir}>
                      Date
                    </SortLink>
                  </Th>
                  <Th>
                    <SortLink basePath="/purchase/bills" query={query} sortKey="total" currentSort={sort} currentDir={dir}>
                      Total
                    </SortLink>
                  </Th>
                  <Th>
                    <SortLink basePath="/purchase/bills" query={query} sortKey="paid" currentSort={sort} currentDir={dir}>
                      Paid
                    </SortLink>
                  </Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <Link href={`/purchase/bills/${r.id}`} className="font-medium hover:text-saffron">
                        {r.number}
                      </Link>
                    </Td>
                    <Td>{r.supplier.name}</Td>
                    <Td>{formatDate(r.date)}</Td>
                    <Td>{money(r.total)}</Td>
                    <Td>{money(r.paid)}</Td>
                    <Td>
                      <StatusBadge status={r.status} paid={r.paid} total={r.total} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPager basePath="/purchase/bills" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
