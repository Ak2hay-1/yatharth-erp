import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, Field, Input, PageHeader, Table, Td, Th, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { LineEditor } from "@/components/line-editor";
import {
  cancelGoodsReceipt,
  confirmGoodsReceipt,
  createSupplierBill,
  updateGoodsReceipt,
} from "@/server/purchase";
import { formatDate, qty, toInputDate } from "@/lib/utils";

export default async function GrnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const grn = await prisma.goodsReceipt.findUnique({
    where: { id },
    include: {
      po: { include: { supplier: true } },
      lines: { include: { item: true } },
      bills: true,
    },
  });
  if (!grn) notFound();
  const items = grn.lines.map((l) => l.item);
  return (
    <div>
      <PageHeader
        title={grn.number}
        subtitle={`${grn.po.supplier.name} · PO ${grn.po.number}`}
        actions={<StatusBadge status={grn.status} />}
      />
      <Card className="p-5">
        {grn.status === "DRAFT" ? (
          <>
            <ActionForm action={updateGoodsReceipt.bind(null, grn.id)} className="space-y-4">
              <Field label="Date">
                <Input name="date" type="date" required defaultValue={toInputDate(grn.date)} />
              </Field>
              <LineEditor
                items={items}
                rateField="purchasePrice"
                showLot
                canCreate={false}
                initial={grn.lines.map((l) => ({
                  itemId: l.itemId,
                  qty: String(l.qty),
                  rate: "0",
                  lotNo: l.lotNo,
                  mfgDate: l.mfgDate ? toInputDate(l.mfgDate) : "",
                  expiryDate: l.expiryDate ? toInputDate(l.expiryDate) : "",
                }))}
              />
              <SubmitButton>Save changes</SubmitButton>
            </ActionForm>
            <div className="mt-4 flex gap-2">
              <ActionForm action={confirmGoodsReceipt.bind(null, grn.id)}>
                <SubmitButton>Confirm GRN (stock in)</SubmitButton>
              </ActionForm>
              <ActionForm action={cancelGoodsReceipt.bind(null, grn.id)}>
                <SubmitButton variant="danger">Cancel draft</SubmitButton>
              </ActionForm>
            </div>
          </>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th>Qty</Th>
                <Th>Lot</Th>
                <Th>Mfg</Th>
                <Th>Expiry</Th>
              </tr>
            </thead>
            <tbody>
              {grn.lines.map((l) => (
                <tr key={l.id}>
                  <Td>{l.item.name}</Td>
                  <Td>{qty(l.qty, l.item.unit)}</Td>
                  <Td>{l.lotNo}</Td>
                  <Td>{formatDate(l.mfgDate)}</Td>
                  <Td>{formatDate(l.expiryDate)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {grn.status === "CONFIRMED" && grn.bills.length === 0 ? (
          <ActionForm action={createSupplierBill} className="mt-6 flex max-w-sm items-end gap-3">
            <input type="hidden" name="grnId" value={grn.id} />
            <Field label="Bill date">
              <Input name="date" type="date" required defaultValue={toInputDate()} />
            </Field>
            <SubmitButton>Create supplier bill</SubmitButton>
          </ActionForm>
        ) : null}
        {grn.bills.map((b) => (
          <p key={b.id} className="mt-4 text-sm">
            Bill:{" "}
            <a className="text-saffron" href={`/purchase/bills/${b.id}`}>
              {b.number}
            </a>
          </p>
        ))}
      </Card>
    </div>
  );
}
