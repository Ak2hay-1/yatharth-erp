import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, LinkButton, StatusBadge, Empty, Badge } from "@/components/ui";
import { formatDate, monthBoundsIst } from "@/lib/utils";
import { labelOf, ORDER_KINDS } from "@/lib/labels";
import { KPI_TARGETS } from "@/lib/labels";

export default async function SamplesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const pageSize = 40;
  const { start: monthStart } = monthBoundsIst();

  const [samples, sampleCount, sampleCustomers, prospects, commercialThisMonth, firstInvoices] = await Promise.all([
    prisma.salesOrder.findMany({
      where: { kind: { in: ["SAMPLE", "TRIAL"] } },
      include: { customer: true, lines: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salesOrder.count({ where: { kind: { in: ["SAMPLE", "TRIAL"] } } }),
    prisma.salesOrder.findMany({
      where: { kind: { in: ["SAMPLE", "TRIAL"] } },
      select: { customerId: true },
      distinct: ["customerId"],
    }),
    prisma.party.findMany({
      where: { lifecycle: "PROSPECT", isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: {
        kind: "COMMERCIAL",
        status: "CONFIRMED",
        channel: "B2B",
        date: { gte: monthStart },
      },
      select: { customerId: true, date: true },
    }),
    prisma.invoice.groupBy({
      by: ["customerId"],
      where: { kind: "COMMERCIAL", status: "CONFIRMED", channel: "B2B" },
      _min: { date: true },
    }),
  ]);

  const firstCommercialIds = new Set(
    firstInvoices.filter((row) => row._min.date && row._min.date >= monthStart).map((row) => row.customerId),
  );

  const sampleCustomerIds = new Set(sampleCustomers.map((s) => s.customerId));
  const converted = [...sampleCustomerIds].filter((id) =>
    commercialThisMonth.some((c) => c.customerId === id),
  );

  return (
    <div>
      <PageHeader
        title="Samples & trials"
        subtitle={`Acquisition funnel toward ${KPI_TARGETS.newCustomersPerMonth} new B2B customers / month.`}
        actions={
          <>
            <LinkButton href="/sales/orders/new?kind=SAMPLE" variant="secondary">
              New sample
            </LinkButton>
            <LinkButton href="/masters/parties/new?lifecycle=PROSPECT">New prospect</LinkButton>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted">Prospects</div>
          <div className="font-display text-2xl">{prospects.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted">Samples / trials</div>
          <div className="font-display text-2xl">{sampleCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted">Converted this month</div>
          <div className="font-display text-2xl">{converted.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted">New B2B customers MTD</div>
          <div className="font-display text-2xl">
            {firstCommercialIds.size}
            <span className="text-sm text-muted"> / {KPI_TARGETS.newCustomersPerMonth}</span>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-2">
          <h2 className="font-display px-3 pt-3 text-xl">Prospect pipeline</h2>
          {prospects.length === 0 ? (
            <Empty>No open prospects. Add a party with lifecycle = Prospect.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>City</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <Link href={`/masters/parties/${p.id}`} className="font-medium hover:text-saffron">
                        {p.name}
                      </Link>
                    </Td>
                    <Td>{p.city || "—"}</Td>
                    <Td>
                      <Link
                        href={`/sales/orders/new?customerId=${p.id}&kind=SAMPLE`}
                        className="text-sm text-saffron hover:underline"
                      >
                        Send sample
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-2">
          <h2 className="font-display px-3 pt-3 text-xl">Sample / trial orders</h2>
          {samples.length === 0 ? (
            <Empty>No samples yet.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Kind</Th>
                  <Th>Feedback</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <Link href={`/sales/orders/${s.id}`} className="font-medium hover:text-saffron">
                        {s.number}
                      </Link>
                      <div className="text-xs text-muted">{formatDate(s.date)}</div>
                    </Td>
                    <Td>{s.customer.name}</Td>
                    <Td>{labelOf(ORDER_KINDS, s.kind)}</Td>
                    <Td>
                      {s.feedbackAt ? <Badge tone="ok">Captured</Badge> : <Badge tone="warn">Pending</Badge>}
                    </Td>
                    <Td>
                      <StatusBadge status={s.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {sampleCount > pageSize ? (
            <div className="flex gap-3 px-3 py-3 text-sm">
              {page > 1 ? <Link href={`/sales/samples?page=${page - 1}`} className="text-saffron">Previous</Link> : null}
              <span className="text-muted">Page {page} of {Math.ceil(sampleCount / pageSize)}</span>
              {page * pageSize < sampleCount ? (
                <Link href={`/sales/samples?page=${page + 1}`} className="text-saffron">Next</Link>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
