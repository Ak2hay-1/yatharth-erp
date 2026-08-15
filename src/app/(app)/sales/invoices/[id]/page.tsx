import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, StatusBadge, LinkButton, Field, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { LineEditor } from "@/components/line-editor";
import {
  cancelInvoice,
  confirmInvoice,
  repeatFromInvoice,
  saveDispatchChecklist,
  updateDraftInvoice,
} from "@/server/sales";
import { getStockHints } from "@/server/stock";
import { customerOutstanding } from "@/server/credit";
import { formatDate, money, qty, toInputDate } from "@/lib/utils";
import { labelOf, ORDER_KINDS } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { MANAGEMENT, can } from "@/lib/permissions";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const canManage = can(user.role, MANAGEMENT);
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      lines: { include: { item: true, batch: true } },
      challans: true,
    },
  });
  if (!inv) notFound();

  const outstanding = await customerOutstanding(prisma, inv.customerId, inv.id);
  const exposure = outstanding + (inv.status === "DRAFT" ? inv.total : 0);
  const overLimit =
    inv.customer.creditLimit > 0 && inv.kind === "COMMERCIAL" && exposure > inv.customer.creditLimit;
  const challan = inv.challans[0];
  const [fgItems, stockHints] =
    inv.status === "DRAFT"
      ? await Promise.all([
          prisma.item.findMany({ where: { isActive: true, type: "FINISHED" }, orderBy: { name: "asc" } }),
          getStockHints(),
        ])
      : [[], {} as Awaited<ReturnType<typeof getStockHints>>];

  return (
    <div>
      <PageHeader
        title={inv.number}
        subtitle={`${inv.customer.name} · ${labelOf(ORDER_KINDS, inv.kind)} · ${formatDate(inv.date)} · ${inv.isInterstate ? "IGST" : "CGST+SGST"}`}
        actions={
          <>
            <StatusBadge status={inv.status} />
            {inv.status === "CONFIRMED" ? (
              <>
                <LinkButton href={`/print/invoice/${inv.id}`} variant="secondary">
                  Print invoice
                </LinkButton>
                {challan ? (
                  <LinkButton href={`/print/challan/${challan.id}`} variant="secondary">
                    Print challan
                  </LinkButton>
                ) : null}
                <LinkButton href={`/payments/new?direction=IN&partyId=${inv.customerId}`} variant="secondary">
                  Record receipt
                </LinkButton>
                <ActionForm action={repeatFromInvoice.bind(null, inv.id)}>
                  <SubmitButton variant="secondary">Repeat as new order</SubmitButton>
                </ActionForm>
              </>
            ) : null}
          </>
        }
      />
      {overLimit ? (
        <Card className="mb-4 border-bad/40 bg-red-50 p-4 text-sm text-bad">
          Confirming would exceed credit limit {money(inv.customer.creditLimit)} (outstanding {money(outstanding)} +
          this invoice {money(inv.total)}).
        </Card>
      ) : null}
      <div className="space-y-4">
        <Card className="p-5">
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th>Lot</Th>
                <Th>HSN</Th>
                <Th>Qty</Th>
                <Th>Rate</Th>
                <Th>Taxable</Th>
                <Th>Tax</Th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l) => (
                <tr key={l.id}>
                  <Td>{l.item.name}</Td>
                  <Td className="font-mono text-xs">{l.batch?.lotNo ?? "—"}</Td>
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
            <div className="flex justify-between">
              <span className="text-muted">Taxable</span>
              <span>{money(inv.taxable)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">CGST</span>
              <span>{money(inv.cgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">SGST</span>
              <span>{money(inv.sgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">IGST</span>
              <span>{money(inv.igst)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{money(inv.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Due</span>
              <span>{money(inv.total - inv.paid)}</span>
            </div>
            {inv.promisedDate ? (
              <div className="flex justify-between">
                <span className="text-muted">Promised</span>
                <span>{formatDate(inv.promisedDate)}</span>
              </div>
            ) : null}
          </div>
          {inv.status === "DRAFT" ? (
            <div className="mt-6 space-y-4">
              <ActionForm action={updateDraftInvoice.bind(null, inv.id)} className="space-y-3">
                <LineEditor
                  items={fgItems}
                  showStock
                  stockHints={stockHints}
                  canCreate={canManage}
                  defaultType="FINISHED"
                  initial={inv.lines.map((l) => ({
                    itemId: l.itemId,
                    qty: String(l.qty),
                    rate: String(l.rate),
                  }))}
                />
                <SubmitButton>Save draft lines</SubmitButton>
              </ActionForm>
              <div className="flex gap-2">
                <ActionForm action={confirmInvoice.bind(null, inv.id)}>
                  <SubmitButton>Confirm invoice (issue stock FEFO)</SubmitButton>
                </ActionForm>
                <ActionForm action={cancelInvoice.bind(null, inv.id)}>
                  <SubmitButton variant="danger">Cancel draft</SubmitButton>
                </ActionForm>
              </div>
            </div>
          ) : null}
        </Card>

        {challan ? (
          <Card className="p-5">
            <h2 className="font-display mb-3 text-xl">Cold-chain dispatch checklist · {challan.number}</h2>
            <ActionForm action={saveDispatchChecklist.bind(null, challan.id)} className="grid gap-3 md:grid-cols-2">
              <Field label="Vehicle no">
                <Input name="vehicleNo" defaultValue={challan.vehicleNo} />
              </Field>
              <Field label="Dispatched at">
                <Input
                  name="dispatchedAt"
                  type="datetime-local"
                  defaultValue={
                    challan.dispatchedAt
                      ? new Date(challan.dispatchedAt.getTime() - challan.dispatchedAt.getTimezoneOffset() * 60000)
                          .toISOString()
                          .slice(0, 16)
                      : `${toInputDate()}T09:00`
                  }
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="freezerOk" defaultChecked={challan.freezerOk} />
                Product left frozen storage OK
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="sealOk" defaultChecked={challan.sealOk} />
                Pack seals intact
              </label>
              <Field label="Customer freezer note" className="md:col-span-2">
                <Input name="customerFreezerNote" defaultValue={challan.customerFreezerNote} />
              </Field>
              <Field label="Notes" className="md:col-span-2">
                <Textarea name="notes" defaultValue={challan.notes} />
              </Field>
              <div>
                <SubmitButton>Save dispatch checklist</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
