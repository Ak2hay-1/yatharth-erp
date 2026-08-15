import Link from "next/link";
import type { DocStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, Empty, StatusBadge } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { dateRange, parseListQuery } from "@/lib/filters";
import { formatDate, money } from "@/lib/utils";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string }>;
}) {
  const { q, status, from, to } = parseListQuery(await searchParams);
  const range = dateRange(from, to);
  const rows = await prisma.invoice.findMany({
    where: {
      ...(status ? { status: status as DocStatus } : {}),
      ...(range ? { date: range } : {}),
      ...(q
        ? {
            OR: [{ number: { contains: q } }, { customer: { name: { contains: q } } }],
          }
        : {}),
    },
    include: { customer: true, challans: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader title="GST invoices" subtitle="Tax invoices for B2B and B2C." />
      <Card className="p-2">
        <ListFilters q={q} status={status} from={from} to={to} showStatus showDates placeholder="Invoice no or customer" />
        {rows.length === 0 ? (
          <Empty>No invoices match.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Customer</Th>
                <Th>Channel</Th>
                <Th>Date</Th>
                <Th>Total</Th>
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
                  <Td>{money(r.total)}</Td>
                  <Td>{money(r.total - r.paid)}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
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
        )}
      </Card>
    </div>
  );
}
