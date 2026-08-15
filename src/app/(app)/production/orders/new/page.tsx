import { Card, Field, Input, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { NamedSearch } from "@/components/named-search";
import { createWorkOrder } from "@/server/production";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OPS } from "@/lib/permissions";
import { toInputDate } from "@/lib/utils";

export default async function NewWorkOrderPage() {
  await requireRole(OPS);
  const recipes = await prisma.recipe.findMany({
    include: { finishedItem: true },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <PageHeader title="New work order" />
      <Card className="max-w-xl p-6">
        <ActionForm action={createWorkOrder} className="space-y-4">
          <Field label="Recipe">
            <NamedSearch
              name="recipeId"
              required
              placeholder="Type recipe"
              options={recipes.map((r) => ({
                id: r.id,
                label: r.name,
                sub: `out ${r.outputQty} ${r.finishedItem.unit}`,
              }))}
            />
          </Field>
          <Field label="Planned output qty">
            <Input name="plannedQty" type="number" step="0.001" required />
          </Field>
          <Field label="Date">
            <Input name="date" type="date" required defaultValue={toInputDate()} />
          </Field>
          <Field label="Notes">
            <Input name="notes" />
          </Field>
          <SubmitButton>Create work order</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
