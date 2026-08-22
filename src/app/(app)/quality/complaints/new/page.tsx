import { Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { NamedSearch } from "@/components/named-search";
import { createComplaint } from "@/server/complaints";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT, OPS, can } from "@/lib/permissions";
import { COMPLAINT_ISSUES } from "@/lib/labels";

export default async function NewComplaintPage() {
  const user = await requireRole(OPS);
  const canManage = can(user.role, MANAGEMENT);
  const [customers, items, batches] = await Promise.all([
    prisma.party.findMany({
      where: { isActive: true, kind: { in: ["CUSTOMER", "BOTH"] } },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({ where: { type: "FINISHED", isActive: true }, orderBy: { name: "asc" } }),
    prisma.batch.findMany({
      where: { item: { type: "FINISHED" }, qtyOnHand: { gte: 0 } },
      include: { item: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return (
    <div>
      <PageHeader title="Log complaint" />
      <Card className="max-w-2xl p-6">
        <ActionForm action={createComplaint} className="grid gap-4 md:grid-cols-2">
          <Field label="Customer" className="md:col-span-2">
            <NamedSearch
              name="customerId"
              required
              placeholder="Type customer"
              create="party"
              canCreate={canManage}
              defaultKind="CUSTOMER"
              createLabel="Add new customer"
              options={customers.map((c) => ({ id: c.id, label: c.name }))}
            />
          </Field>
          <Field label="SKU">
            <NamedSearch
              name="itemId"
              placeholder="Optional SKU"
              create="item"
              canCreate={canManage}
              defaultType="FINISHED"
              items={items}
            />
          </Field>
          <Field label="Lot">
            <NamedSearch
              name="batchId"
              placeholder="Optional lot"
              options={batches.map((b) => ({ id: b.id, label: `${b.item.name} · ${b.lotNo}` }))}
            />
          </Field>
          <Field label="Issue" className="md:col-span-2">
            <Select name="issue" required>
              {COMPLAINT_ISSUES.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="What the customer reported" className="md:col-span-2">
            <Textarea name="description" required placeholder="Chicken patty tastes good but is too dry." />
          </Field>
          <Field label="Photos / documents (optional)" className="md:col-span-2">
            <Input
              name="attachments"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx"
              className="file:mr-3 file:rounded-md file:border-0 file:bg-forest file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
          </Field>
          <Field label="Related invoice id (optional)" className="md:col-span-2">
            <Input name="invoiceId" placeholder="Leave blank if unknown" />
          </Field>
          <div className="md:col-span-2">
            <SubmitButton>Save complaint</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
