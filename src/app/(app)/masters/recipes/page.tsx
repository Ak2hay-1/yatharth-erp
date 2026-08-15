import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, LinkButton, Empty } from "@/components/ui";
import { qty } from "@/lib/utils";

export default async function RecipesPage() {
  await requireRole(MANAGEMENT);
  const recipes = await prisma.recipe.findMany({
    include: { finishedItem: true, lines: { include: { item: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <PageHeader
        title="Recipes / BOM"
        subtitle="What goes into each finished batch."
        actions={<LinkButton href="/masters/recipes/new">New recipe</LinkButton>}
      />
      <Card className="p-2">
        {recipes.length === 0 ? (
          <Empty>No recipes yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Recipe</Th>
                <Th>Finished SKU</Th>
                <Th>Output</Th>
                <Th>Ingredients</Th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <Link href={`/masters/recipes/${r.id}`} className="font-medium hover:text-saffron">
                      {r.name}
                    </Link>
                  </Td>
                  <Td>{r.finishedItem.name}</Td>
                  <Td>{qty(r.outputQty, r.finishedItem.unit)}</Td>
                  <Td>{r.lines.length}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
