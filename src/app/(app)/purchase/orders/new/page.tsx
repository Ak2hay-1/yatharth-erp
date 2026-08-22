import { Card, Field, Input, PageHeader } from "@/components/ui";
import { LineEditor } from "@/components/line-editor";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { NamedSearch } from "@/components/named-search";
import { createPurchaseOrder } from "@/server/purchase";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT, OPS, can } from "@/lib/permissions";
import { toInputDate } from "@/lib/utils";

export default async function NewPOPage() {
  const user = await requireRole(OPS);
  const canManage = can(user.role, MANAGEMENT);
  const [suppliers, items] = await Promise.all([
    prisma.party.findMany({
      where: { isActive: true, kind: { in: ["SUPPLIER", "BOTH"] } },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: { isActive: true, type: { in: ["RAW", "PACKING"] } },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <div>
      <PageHeader title="New purchase order" />
      <Card className="p-6">
        <ActionForm action={createPurchaseOrder} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Supplier">
              <NamedSearch
                name="supplierId"
                required
                placeholder="Type supplier"
                create="party"
                canCreate={canManage}
                defaultKind="SUPPLIER"
                createLabel="Add new supplier"
                options={suppliers.map((s) => ({ id: s.id, label: s.name }))}
              />
            </Field>
            <Field label="Date">
              <Input name="date" type="date" required defaultValue={toInputDate()} />
            </Field>
            <Field label="Notes">
              <Input name="notes" />
            </Field>
          </div>
          <LineEditor items={items} rateField="purchasePrice" canCreate={canManage} defaultType="RAW" />
          <SubmitButton>Save draft PO</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
