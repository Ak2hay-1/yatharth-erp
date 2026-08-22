import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FINANCE } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, LinkButton, Empty, Badge } from "@/components/ui";
import { formatDate, money } from "@/lib/utils";

export default async function PaymentsPage() {
  await requireRole(FINANCE);
  const rows = await prisma.payment.findMany({
    include: { party: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Customer receipts and supplier payments."
        actions={
          <>
            <LinkButton href="/payments/new?direction=IN">Receive</LinkButton>
            <LinkButton href="/payments/new?direction=OUT" variant="secondary">
              Pay supplier
            </LinkButton>
          </>
        }
      />
      <Card className="p-2">
        {rows.length === 0 ? (
          <Empty>No payments recorded.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Party</Th>
                <Th>Direction</Th>
                <Th>Date</Th>
                <Th>Mode</Th>
                <Th>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium">{r.number}</Td>
                  <Td>{r.party.name}</Td>
                  <Td>
                    <Badge tone={r.direction === "IN" ? "ok" : "warn"}>{r.direction}</Badge>
                  </Td>
                  <Td>{formatDate(r.date)}</Td>
                  <Td>{r.mode}</Td>
                  <Td>{money(r.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
