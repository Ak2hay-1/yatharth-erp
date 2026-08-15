import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, Field, Input, PageHeader, Table, Td, Th, StatusBadge, LinkButton } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { NamedSearch } from "@/components/named-search";
import { LineEditor } from "@/components/line-editor";
import {
  cancelPurchaseOrder,
  confirmPurchaseOrder,
  updatePurchaseOrder,
} from "@/server/purchase";
import { formatDate, money, qty, toInputDate } from "@/lib/utils";
import { requireUser } from "@/lib/session";
import { MANAGEMENT, can } from "@/lib/permissions";

export default async function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const canManage = can(user.role, MANAGEMENT);
  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, lines: { include: { item: true } }, receipts: { include: { lines: true } } },
  });
  if (!po) notFound();

  const [suppliers, items] = po.status === "DRAFT"
    ? await Promise.all([
        prisma.party.findMany({
          where: { isActive: true, kind: { in: ["SUPPLIER", "BOTH"] } },
          orderBy: { name: "asc" },
        }),
        prisma.item.findMany({
          where: { isActive: true, type: { in: ["RAW", "PACKING"] } },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], []];

  const received: Record<string, number> = {};
  for (const r of po.receipts.filter((x) => x.status === "CONFIRMED")) {
    for (const l of r.lines) received[l.itemId] = (received[l.itemId] ?? 0) + l.qty;
  }

  return (
    <div>
      <PageHeader
        title={po.number}
        subtitle={`${po.supplier.name} · ${formatDate(po.date)}`}
        actions={
          <>
            <StatusBadge status={po.status} />
            {po.status === "CONFIRMED" ? (
              <LinkButton href={`/purchase/grn/new?poId=${po.id}`}>Create GRN</LinkButton>
            ) : null}
          </>
        }
      />
      {po.status === "DRAFT" ? (
        <Card className="p-6">
          <ActionForm action={updatePurchaseOrder.bind(null, po.id)} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Supplier">
                <NamedSearch
                  name="supplierId"
                  required
                  defaultValue={po.supplierId}
                  create="party"
                  canCreate={canManage}
                  defaultKind="SUPPLIER"
                  createLabel="Add new supplier"
                  options={suppliers.map((s) => ({ id: s.id, label: s.name }))}
                />
              </Field>
              <Field label="Date">
                <Input name="date" type="date" required defaultValue={toInputDate(po.date)} />
              </Field>
              <Field label="Notes">
                <Input name="notes" defaultValue={po.notes} />
              </Field>
            </div>
            <LineEditor
              items={items}
              rateField="purchasePrice"
              canCreate={canManage}
              defaultType="RAW"
              initial={po.lines.map((l) => ({
                itemId: l.itemId,
                qty: String(l.qty),
                rate: String(l.rate),
              }))}
            />
            <div className="flex flex-wrap gap-2">
              <SubmitButton>Save changes</SubmitButton>
            </div>
          </ActionForm>
          <div className="mt-4 flex gap-2">
            <ActionForm action={confirmPurchaseOrder.bind(null, po.id)}>
              <SubmitButton>Confirm PO</SubmitButton>
            </ActionForm>
            <ActionForm action={cancelPurchaseOrder.bind(null, po.id)}>
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
                <Th>Ordered</Th>
                <Th>Received</Th>
                <Th>Rate</Th>
                <Th>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {po.lines.map((l) => (
                <tr key={l.id}>
                  <Td>
                    {l.item.name}
                    <div className="text-xs text-muted">{l.item.sku}</div>
                  </Td>
                  <Td>{qty(l.qty, l.item.unit)}</Td>
                  <Td>{qty(received[l.itemId] ?? 0, l.item.unit)}</Td>
                  <Td>{money(l.rate)}</Td>
                  <Td>{money(l.qty * l.rate)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {po.receipts.length ? (
            <p className="mt-4 text-sm text-muted">
              GRNs:{" "}
              {po.receipts.map((g) => (
                <a key={g.id} href={`/purchase/grn/${g.id}`} className="mr-2 text-saffron">
                  {g.number}
                </a>
              ))}
            </p>
          ) : null}
        </Card>
      )}
    </div>
  );
}
