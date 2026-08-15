import Link from "next/link";
import type { DocStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, LinkButton, StatusBadge, Empty } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { dateRange, parseListQuery } from "@/lib/filters";
import { formatDate } from "@/lib/utils";
import { labelOf, ORDER_KINDS } from "@/lib/labels";

export default async function SalesOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string }>;
}) {
  const { q, status, from, to } = parseListQuery(await searchParams);
  const range = dateRange(from, to);
  const rows = await prisma.salesOrder.findMany({
    where: {
      ...(status ? { status: status as DocStatus } : {}),
      ...(range ? { date: range } : {}),
      ...(q
        ? {
            OR: [{ number: { contains: q } }, { customer: { name: { contains: q } } }],
          }
        : {}),
    },
    include: { customer: true, lines: true },
    orderBy: { createdAt: "desc" },
  });
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
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Customer</Th>
                <Th>Kind</Th>
                <Th>Date</Th>
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
        )}
      </Card>
    </div>
  );
}
