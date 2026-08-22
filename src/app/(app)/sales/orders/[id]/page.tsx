import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, Field, Input, PageHeader, Table, Td, Th, StatusBadge, LinkButton, Textarea, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { NamedSearch } from "@/components/named-search";
import { LineEditor } from "@/components/line-editor";
import {
  cancelSalesOrder,
  confirmSalesOrder,
  createInvoiceFromOrder,
  saveTrialFeedback,
  updateSalesOrder,
} from "@/server/sales";
import { getStockHints } from "@/server/stock";
import { formatDate, money, qty, toInputDate } from "@/lib/utils";
import { labelOf, ORDER_KINDS } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { MANAGEMENT, can } from "@/lib/permissions";

export default async function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const canManage = can(user.role, MANAGEMENT);
  const { id } = await params;
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    include: { customer: true, lines: { include: { item: true } }, invoices: true },
  });
  if (!so) notFound();
  const isSample = so.kind === "SAMPLE" || so.kind === "TRIAL";

  const [customers, items, stockHints] =
    so.status === "DRAFT"
      ? await Promise.all([
          prisma.party.findMany({
            where: { isActive: true, kind: { in: ["CUSTOMER", "BOTH"] } },
            orderBy: { name: "asc" },
          }),
          prisma.item.findMany({ where: { isActive: true, type: "FINISHED" }, orderBy: { name: "asc" } }),
          getStockHints(),
        ])
      : [[], [], {} as Awaited<ReturnType<typeof getStockHints>>];

  return (
    <div>
      <PageHeader
        title={so.number}
        subtitle={`${so.customer.name} · ${labelOf(ORDER_KINDS, so.kind)} · ${so.channel} · ${formatDate(so.date)}`}
        actions={<StatusBadge status={so.status} />}
      />
      <div className="space-y-4">
        {so.status === "DRAFT" ? (
          <Card className="p-6">
            <ActionForm action={updateSalesOrder.bind(null, so.id)} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <Field label="Customer" className="md:col-span-2">
                  <NamedSearch
                    name="customerId"
                    required
                    defaultValue={so.customerId}
                    create="party"
                    canCreate={canManage}
                    defaultKind="CUSTOMER"
                    createLabel="Add new customer"
                    options={customers.map((c) => ({ id: c.id, label: c.name }))}
                  />
                </Field>
                <Field label="Order kind">
                  <Select name="kind" defaultValue={so.kind}>
                    {ORDER_KINDS.map((x) => (
                      <option key={x.value} value={x.value}>
                        {x.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Channel">
                  <Select name="channel" defaultValue={so.channel}>
                    <option value="B2B">B2B</option>
                    <option value="B2C">B2C</option>
                  </Select>
                </Field>
                <Field label="Date">
                  <Input name="date" type="date" required defaultValue={toInputDate(so.date)} />
                </Field>
                <Field label="Promised delivery">
                  <Input name="promisedDate" type="date" defaultValue={so.promisedDate ? toInputDate(so.promisedDate) : ""} />
                </Field>
                <Field label="Notes" className="md:col-span-3 lg:col-span-6">
                  <Input name="notes" defaultValue={so.notes} />
                </Field>
              </div>
              <LineEditor
                items={items}
                showStock
                stockHints={stockHints}
                canCreate={canManage}
                defaultType="FINISHED"
                initial={so.lines.map((l) => ({
                  itemId: l.itemId,
                  qty: String(l.qty),
                  rate: String(l.rate),
                }))}
              />
              <SubmitButton>Save changes</SubmitButton>
            </ActionForm>
            <div className="mt-4 flex gap-2">
              <ActionForm action={confirmSalesOrder.bind(null, so.id)}>
                <SubmitButton>Confirm order</SubmitButton>
              </ActionForm>
              <ActionForm action={cancelSalesOrder.bind(null, so.id)}>
                <SubmitButton variant="danger">Cancel draft</SubmitButton>
              </ActionForm>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <Table>
              <thead>
                <tr>
                  <Th>Item</Th>
                  <Th>Qty</Th>
                  <Th>Rate</Th>
                  <Th>Amount</Th>
                </tr>
              </thead>
              <tbody>
                {so.lines.map((l) => (
                  <tr key={l.id}>
                    <Td>{l.item.name}</Td>
                    <Td>{qty(l.qty, l.item.unit)}</Td>
                    <Td>{money(l.rate)}</Td>
                    <Td>{money(l.qty * l.rate)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {so.promisedDate ? (
              <p className="mt-3 text-sm text-muted">Promised delivery: {formatDate(so.promisedDate)}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {so.status === "CONFIRMED" && so.invoices.length === 0 ? (
                <ActionForm action={createInvoiceFromOrder.bind(null, so.id)}>
                  <SubmitButton>{isSample ? "Issue sample (GST doc)" : "Create GST invoice"}</SubmitButton>
                </ActionForm>
              ) : null}
              {so.invoices.map((inv) => (
                <LinkButton key={inv.id} href={`/sales/invoices/${inv.id}`} variant="secondary">
                  Invoice {inv.number}
                </LinkButton>
              ))}
              {isSample ? (
                <LinkButton href={`/sales/orders/new?customerId=${so.customerId}&kind=COMMERCIAL`} variant="secondary">
                  Create commercial order
                </LinkButton>
              ) : null}
            </div>
          </Card>
        )}

        {isSample ? (
          <Card className="p-5">
            <h2 className="font-display mb-3 text-xl">Trial feedback</h2>
            <ActionForm action={saveTrialFeedback.bind(null, so.id)} className="grid gap-3 md:grid-cols-2">
              <Field label="Use case">
                <Input name="feedbackUseCase" defaultValue={so.feedbackUseCase} placeholder="Burger / platter / catering" />
              </Field>
              <Field label="Taste">
                <Input name="feedbackTaste" defaultValue={so.feedbackTaste} />
              </Field>
              <Field label="Size / portion">
                <Input name="feedbackSize" defaultValue={so.feedbackSize} />
              </Field>
              <Field label="Coating">
                <Input name="feedbackCoating" defaultValue={so.feedbackCoating} />
              </Field>
              <Field label="Kitchen wastage" className="md:col-span-2">
                <Input name="feedbackKitchenWaste" defaultValue={so.feedbackKitchenWaste} />
              </Field>
              <Field label="Notes" className="md:col-span-2">
                <Textarea name="feedbackNotes" defaultValue={so.feedbackNotes} />
              </Field>
              <div className="md:col-span-2">
                <SubmitButton>Save feedback</SubmitButton>
                {so.feedbackAt ? (
                  <span className="ml-3 text-xs text-muted">Last saved {formatDate(so.feedbackAt)}</span>
                ) : null}
              </div>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
