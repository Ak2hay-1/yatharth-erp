import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FINANCE } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, StatusBadge, LinkButton } from "@/components/ui";
import { formatDate, money, qty } from "@/lib/utils";

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(FINANCE);
  const { id } = await params;
  const bill = await prisma.supplierBill.findUnique({
    where: { id },
    include: { supplier: true, lines: { include: { item: true } }, grn: true },
  });
  if (!bill) notFound();
  return (
    <div>
      <PageHeader
        title={bill.number}
        subtitle={`${bill.supplier.name} · ${formatDate(bill.date)}`}
        actions={
          <>
            <StatusBadge status={bill.status} />
            <LinkButton href={`/payments/new?direction=OUT&partyId=${bill.supplierId}`} variant="secondary">
              Record payment
            </LinkButton>
          </>
        }
      />
      <Card className="p-5">
        <Table>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th>HSN</Th>
              <Th>Qty</Th>
              <Th>Rate</Th>
              <Th>Taxable</Th>
              <Th>GST</Th>
            </tr>
          </thead>
          <tbody>
            {bill.lines.map((l) => (
              <tr key={l.id}>
                <Td>{l.item.name}</Td>
                <Td>{l.hsn}</Td>
                <Td>{qty(l.qty, l.item.unit)}</Td>
                <Td>{money(l.rate)}</Td>
                <Td>{money(l.taxable)}</Td>
                <Td>{money(l.cgst + l.sgst + l.igst)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <Row k="Taxable" v={money(bill.taxable)} />
          <Row k="CGST" v={money(bill.cgst)} />
          <Row k="SGST" v={money(bill.sgst)} />
          <Row k="IGST" v={money(bill.igst)} />
          <Row k="Total" v={money(bill.total)} />
          <Row k="Paid" v={money(bill.paid)} />
          <Row k="Due" v={money(bill.total - bill.paid)} />
        </div>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
