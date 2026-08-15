import Link from "next/link";
import type { DocStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, LinkButton, StatusBadge, Empty } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { dateRange, parseListQuery } from "@/lib/filters";
import { formatDate } from "@/lib/utils";

export default async function GrnListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string }>;
}) {
  const { q, status, from, to } = parseListQuery(await searchParams);
  const range = dateRange(from, to);
  const rows = await prisma.goodsReceipt.findMany({
    where: {
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
    },
    include: { po: { include: { supplier: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader title="Goods receipts" actions={<LinkButton href="/purchase/grn/new">New GRN</LinkButton>} />
      <Card className="p-2">
        <ListFilters q={q} status={status} from={from} to={to} showStatus showDates placeholder="GRN, PO or supplier" />
        {rows.length === 0 ? (
          <Empty>No GRNs match.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>PO</Th>
                <Th>Supplier</Th>
                <Th>Date</Th>
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
        )}
      </Card>
    </div>
  );
}
