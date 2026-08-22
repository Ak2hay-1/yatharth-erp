import { Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { LineEditor } from "@/components/line-editor";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { NamedSearch } from "@/components/named-search";
import { createSalesOrder } from "@/server/sales";
import { getStockHints } from "@/server/stock";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT, OPS, can } from "@/lib/permissions";
import { toInputDate } from "@/lib/utils";
import { ORDER_KINDS } from "@/lib/labels";

export default async function NewSalesOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; kind?: string }>;
}) {
  const user = await requireRole(OPS);
  const canManage = can(user.role, MANAGEMENT);
  const sp = await searchParams;
  const [customers, items, stockHints] = await Promise.all([
    prisma.party.findMany({
      where: { isActive: true, kind: { in: ["CUSTOMER", "BOTH"] } },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: { isActive: true, type: "FINISHED" },
      orderBy: { name: "asc" },
    }),
    getStockHints(),
  ]);
  const kind = sp.kind === "SAMPLE" || sp.kind === "TRIAL" || sp.kind === "COMMERCIAL" ? sp.kind : "COMMERCIAL";
  return (
    <div>
      <PageHeader title="New sales order" />
      <Card className="p-6">
        <ActionForm action={createSalesOrder} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Field label="Customer" className="md:col-span-2">
              <NamedSearch
                name="customerId"
                required
                defaultValue={sp.customerId ?? ""}
                placeholder="Type customer"
                create="party"
                canCreate={canManage}
                defaultKind="CUSTOMER"
                createLabel="Add new customer"
                options={customers.map((c) => ({
                  id: c.id,
                  label: c.name,
                  sub: c.lifecycle === "PROSPECT" ? "prospect" : c.channel ?? undefined,
                }))}
              />
            </Field>
            <Field label="Order kind">
              <Select name="kind" defaultValue={kind}>
                {ORDER_KINDS.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Channel">
              <Select name="channel" defaultValue="B2B">
                <option value="B2B">B2B</option>
                <option value="B2C">B2C</option>
              </Select>
            </Field>
            <Field label="Date">
              <Input name="date" type="date" required defaultValue={toInputDate()} />
            </Field>
            <Field label="Promised delivery">
              <Input name="promisedDate" type="date" defaultValue={toInputDate()} />
            </Field>
            <Field label="Notes" className="md:col-span-3 lg:col-span-6">
              <Input name="notes" />
            </Field>
          </div>
          <LineEditor items={items} showStock stockHints={stockHints} canCreate={canManage} defaultType="FINISHED" />
          <SubmitButton>Save draft order</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
