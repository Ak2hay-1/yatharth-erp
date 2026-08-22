import Link from "next/link";
import type { DocStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, LinkButton, StatusBadge, Empty } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { dateRange, parseListQuery } from "@/lib/filters";
import { formatDate } from "@/lib/utils";

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string }>;
}) {
  const { q, status, from, to } = parseListQuery(await searchParams);
  const range = dateRange(from, to);
  const rows = await prisma.purchaseOrder.findMany({
    where: {
      ...(status ? { status: status as DocStatus } : {}),
      ...(range ? { date: range } : {}),
      ...(q
        ? {
            OR: [{ number: { contains: q } }, { supplier: { name: { contains: q } } }],
          }
        : {}),
    },
    include: { supplier: true, lines: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader
        title="Purchase orders"
        actions={<LinkButton href="/purchase/orders/new">New PO</LinkButton>}
      />
      <Card className="p-2">
        <ListFilters q={q} status={status} from={from} to={to} showStatus showDates placeholder="PO number or supplier" />
        {rows.length === 0 ? (
          <Empty>No purchase orders match.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Supplier</Th>
                <Th>Date</Th>
                <Th>Lines</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <Link href={`/purchase/orders/${r.id}`} className="font-medium hover:text-saffron">
                      {r.number}
                    </Link>
                  </Td>
                  <Td>{r.supplier.name}</Td>
                  <Td>{formatDate(r.date)}</Td>
                  <Td>{r.lines.length}</Td>
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
