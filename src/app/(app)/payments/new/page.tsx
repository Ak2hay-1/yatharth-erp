import { Card, PageHeader } from "@/components/ui";
import { PaymentFields } from "@/components/payment-form";
import { recordPayment } from "@/server/payments";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FINANCE, MANAGEMENT, can } from "@/lib/permissions";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; partyId?: string }>;
}) {
  const user = await requireRole(FINANCE);
  const canManage = can(user.role, MANAGEMENT);
  const sp = await searchParams;
  const direction = sp.direction === "OUT" ? "OUT" : "IN";

  if (direction === "IN") {
    const parties = await prisma.party.findMany({
      where: { kind: { in: ["CUSTOMER", "BOTH"] } },
      orderBy: { name: "asc" },
    });
    const invoices = await prisma.invoice.findMany({
      where: { status: "CONFIRMED" },
      include: { customer: true },
    });
    const docsByParty: Record<string, { id: string; number: string; total: number; paid: number; label: string }[]> =
      {};
    for (const inv of invoices) {
      const due = inv.total - inv.paid;
      if (due <= 0.009) continue;
      docsByParty[inv.customerId] ??= [];
      docsByParty[inv.customerId].push({
        id: inv.id,
        number: inv.number,
        total: inv.total,
        paid: inv.paid,
        label: inv.customer.name,
      });
    }
    return (
      <div>
        <PageHeader title="Receive payment" />
        <Card className="p-6">
          <PaymentFields
            action={recordPayment}
            direction="IN"
            parties={parties.map((p) => ({ id: p.id, name: p.name }))}
            docsByParty={docsByParty}
            defaultPartyId={sp.partyId}
            canCreate={canManage}
          />
        </Card>
      </div>
    );
  }

  const parties = await prisma.party.findMany({
    where: { kind: { in: ["SUPPLIER", "BOTH"] } },
    orderBy: { name: "asc" },
  });
  const bills = await prisma.supplierBill.findMany({
    where: { status: "CONFIRMED" },
    include: { supplier: true },
  });
  const docsByParty: Record<string, { id: string; number: string; total: number; paid: number; label: string }[]> = {};
  for (const bill of bills) {
    const due = bill.total - bill.paid;
    if (due <= 0.009) continue;
    docsByParty[bill.supplierId] ??= [];
    docsByParty[bill.supplierId].push({
      id: bill.id,
      number: bill.number,
      total: bill.total,
      paid: bill.paid,
      label: bill.supplier.name,
    });
  }
  return (
    <div>
      <PageHeader title="Pay supplier" />
      <Card className="p-6">
        <PaymentFields
          action={recordPayment}
          direction="OUT"
          parties={parties.map((p) => ({ id: p.id, name: p.name }))}
          docsByParty={docsByParty}
          defaultPartyId={sp.partyId}
          canCreate={canManage}
        />
      </Card>
    </div>
  );
}
