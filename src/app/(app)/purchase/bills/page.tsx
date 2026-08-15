import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FINANCE } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, Empty, StatusBadge } from "@/components/ui";
import { formatDate, money } from "@/lib/utils";

export default async function BillsPage() {
  await requireRole(FINANCE);
  const rows = await prisma.supplierBill.findMany({
    include: { supplier: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader title="Supplier bills" subtitle="GST purchase register." />
      <Card className="p-2">
        {rows.length === 0 ? (
          <Empty>Create a bill from a confirmed GRN.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Supplier</Th>
                <Th>Date</Th>
                <Th>Total</Th>
                <Th>Paid</Th>
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
