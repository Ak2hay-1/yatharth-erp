import { Card, LinkButton, PageHeader } from "@/components/ui";
import { RecipeForm } from "@/components/master-forms";
import { createRecipe } from "@/server/recipes";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";

export default async function NewRecipePage() {
  await requireRole(MANAGEMENT);
  const items = await prisma.item.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return (
    <div>
      <PageHeader title="New recipe" actions={<LinkButton href="/masters/recipes" variant="secondary">Cancel</LinkButton>} />
      <Card className="p-6">
        <RecipeForm action={createRecipe} items={items} />
      </Card>
    </div>
  );
}
