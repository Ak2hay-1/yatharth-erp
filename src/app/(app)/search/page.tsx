import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, PageHeader, Table, Td, Th, Empty } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { parseListQuery } from "@/lib/filters";
import { formatDate, money } from "@/lib/utils";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const { q } = parseListQuery(await searchParams);
  if (!q) {
    return (
      <div>
        <PageHeader title="Search" subtitle="Find an invoice number, customer, supplier or SKU." />
        <Card className="p-2">
          <ListFilters q={q} placeholder="Type a number or name" />
          <Empty>Type in the sidebar or here.</Empty>
        </Card>
      </div>
    );
  }

  const [invoices, parties, items] = await Promise.all([
    prisma.invoice.findMany({
      where: { OR: [{ number: { contains: q } }, { customer: { name: { contains: q } } }] },
      include: { customer: true },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.party.findMany({
      where: {
        OR: [{ name: { contains: q } }, { gstin: { contains: q } }, { phone: { contains: q } }],
      },
      take: 20,
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: { OR: [{ sku: { contains: q } }, { name: { contains: q } }] },
      take: 20,
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title={`Search “${q}”`} />
      <div className="space-y-4">
        <Card className="p-2">
          <ListFilters q={q} placeholder="Invoice, party, SKU" />
        </Card>
        <Card className="p-5">
          <h2 className="font-display mb-3 text-xl">Invoices</h2>
          {invoices.length === 0 ? (
            <Empty>No invoices.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Customer</Th>
                  <Th>Date</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <Td>
                      <Link href={`/sales/invoices/${i.id}`} className="font-medium hover:text-saffron">
                        {i.number}
                      </Link>
                    </Td>
                    <Td>{i.customer.name}</Td>
                    <Td>{formatDate(i.date)}</Td>
                    <Td>{money(i.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-display mb-3 text-xl">Parties</h2>
          {parties.length === 0 ? (
            <Empty>No parties.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Kind</Th>
                  <Th>GSTIN</Th>
                </tr>
              </thead>
              <tbody>
                {parties.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <Link href={`/masters/parties/${p.id}`} className="font-medium hover:text-saffron">
                        {p.name}
                      </Link>
                    </Td>
                    <Td>{p.kind}</Td>
                    <Td>{p.gstin || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-display mb-3 text-xl">Items</h2>
          {items.length === 0 ? (
            <Empty>No items.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>SKU</Th>
                  <Th>Name</Th>
                  <Th>Type</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <Td>
                      <Link href={`/masters/items/${i.id}`} className="font-medium hover:text-saffron">
                        {i.sku}
                      </Link>
                    </Td>
                    <Td>{i.name}</Td>
                    <Td>{i.type}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
