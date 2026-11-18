import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, LinkButton, Empty } from "@/components/ui";
import { ListPager, SortLink } from "@/components/list-pager";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage, parseSortDir, parseSortKey } from "@/lib/list-page";
import { qty } from "@/lib/utils";

const SORT_KEYS = ["name", "outputQty"] as const;

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string }>;
}) {
  await requireRole(MANAGEMENT);
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const sort = parseSortKey(sp.sort, SORT_KEYS, "name");
  const dir = parseSortDir(sp.dir === "desc" ? "desc" : sp.sort ? sp.dir : "asc");
  const query = { sort, dir, page: String(page) };
  const orderBy = { [sort]: dir } as Prisma.RecipeOrderByWithRelationInput;

  const [total, recipes] = await Promise.all([
    prisma.recipe.count({
      where: { finishedItem: { isActive: true } },
    }),
    prisma.recipe.findMany({
      where: { finishedItem: { isActive: true } },
      include: { finishedItem: true, lines: { include: { item: true } } },
      orderBy,
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

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
          <>
            <Table>
              <thead>
                <tr>
                  <Th>
                    <SortLink
                      basePath="/masters/recipes"
                      query={query}
                      sortKey="name"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Recipe
                    </SortLink>
                  </Th>
                  <Th>Finished SKU</Th>
                  <Th>
                    <SortLink
                      basePath="/masters/recipes"
                      query={query}
                      sortKey="outputQty"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Output
                    </SortLink>
                  </Th>
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
            <ListPager basePath="/masters/recipes" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
