import Link from "next/link";
import type { DocStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, Empty, StatusBadge } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { ListPager, SortLink } from "@/components/list-pager";
import { dateRange, parseListQuery } from "@/lib/filters";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage, parseSortDir, parseSortKey } from "@/lib/list-page";
import { formatDate, money } from "@/lib/utils";

const SORT_KEYS = ["number", "date", "total", "createdAt"] as const;

export default async function InvoicesPage({
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
  const where: Prisma.InvoiceWhereInput = {
    ...(status ? { status: status as DocStatus } : {}),
    ...(range ? { date: range } : {}),
    ...(q
      ? {
          OR: [{ number: { contains: q } }, { customer: { name: { contains: q } } }],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: { customer: true, challans: true },
      orderBy: { [sort]: dir } as Prisma.InvoiceOrderByWithRelationInput,
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return (
    <div>
      <PageHeader title="GST invoices" subtitle="Tax invoices for B2B and B2C." />
      <Card className="p-2">
        <ListFilters q={q} status={status} from={from} to={to} showStatus showDates placeholder="Invoice no or customer" />
        {rows.length === 0 ? (
          <Empty>No invoices match.</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>
                    <SortLink
                      basePath="/sales/invoices"
                      query={query}
                      sortKey="number"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Number
                    </SortLink>
                  </Th>
                  <Th>Customer</Th>
                  <Th>Channel</Th>
                  <Th>
                    <SortLink
                      basePath="/sales/invoices"
                      query={query}
                      sortKey="date"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Date
                    </SortLink>
                  </Th>
                  <Th>
                    <SortLink
                      basePath="/sales/invoices"
                      query={query}
                      sortKey="total"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Total
                    </SortLink>
                  </Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  <Th>Print</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <Link href={`/sales/invoices/${r.id}`} className="font-medium hover:text-saffron">
                        {r.number}
                      </Link>
                    </Td>
                    <Td>{r.customer.name}</Td>
                    <Td>{r.channel}</Td>
                    <Td>{formatDate(r.date)}</Td>
                    <Td>
                      {r.status === "CANCELLED" ? (
                        <span className="text-muted line-through">{money(r.total)}</span>
                      ) : (
                        money(r.total)
                      )}
                    </Td>
                    <Td>{r.status === "CANCELLED" ? money(0) : money(r.total - r.paid)}</Td>
                    <Td>
                      <StatusBadge status={r.status} paid={r.paid} total={r.total} />
                    </Td>
                    <Td>
                      {r.status === "CONFIRMED" ? (
                        <a href={`/print/invoice/${r.id}`} className="text-sm text-saffron">
                          Invoice
                        </a>
                      ) : (
                        "—"
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPager basePath="/sales/invoices" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
