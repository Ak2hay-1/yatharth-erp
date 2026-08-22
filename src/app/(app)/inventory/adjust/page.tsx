import { Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { NamedSearch } from "@/components/named-search";
import { adjustStock } from "@/server/purchase";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT, OPS, can } from "@/lib/permissions";
import { toInputDate } from "@/lib/utils";
import { WASTE_CAUSES } from "@/lib/labels";

export default async function AdjustPage() {
  const user = await requireRole(OPS);
  const canManage = can(user.role, MANAGEMENT);
  const items = await prisma.item.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return (
    <div>
      <PageHeader
        title="Stock adjust / wastage"
        subtitle="Negative qty issues stock by FEFO. Tag freezer / return / production wastage for KPIs."
      />
      <Card className="max-w-xl p-6">
        <ActionForm action={adjustStock} className="space-y-4">
          <Field label="Item">
            <NamedSearch
              name="itemId"
              required
              placeholder="Type SKU or name"
              create="item"
              canCreate={canManage}
              items={items}
            />
          </Field>
          <Field label="Type">
            <Select name="adjustType" defaultValue="ADJUST">
              <option value="ADJUST">Adjustment</option>
              <option value="WASTE">Wastage</option>
            </Select>
          </Field>
          <Field label="Waste cause (if wastage)">
            <Select name="wasteCause" defaultValue="FREEZER">
              {WASTE_CAUSES.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Qty (negative to issue)">
            <Input name="qty" type="number" step="0.001" required />
          </Field>
          <Field label="Lot (for inbound only)">
            <Input name="lotNo" placeholder="Optional" />
          </Field>
          <Field label="Mfg date (inbound)">
            <Input name="mfgDate" type="date" defaultValue={toInputDate()} />
          </Field>
          <Field label="Reason">
            <Input name="reason" required placeholder="Physical count / freezer thaw / return" />
          </Field>
          <Field label="Notes">
            <Textarea name="notes" />
          </Field>
          <SubmitButton>Post movement</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
