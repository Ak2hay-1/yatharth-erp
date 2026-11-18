import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, Empty, Badge } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { ListPager } from "@/components/list-pager";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage } from "@/lib/list-page";
import { ensureItemLabel } from "@/server/labelling";
import { hasFoodVegMark, resolveVegMark } from "@/lib/veg-mark";

export default async function LabellingListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole(MANAGEMENT);
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const query = { page: String(page) };
  const where = { type: "FINISHED" as const, isActive: true };

  const [total, items] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      include: { label: true },
      orderBy: { name: "asc" },
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Labelling"
        subtitle="Ingredient statements and nutrition panels for pack artwork."
      />
      <Card className="p-2">
        {items.length === 0 ? (
          <Empty>No finished goods.</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>SKU</Th>
                  <Th>Label</Th>
                  <Th>Veg mark</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const veg = resolveVegMark(i.label?.vegNonVeg, i.lane, i);
                  const started = Boolean(i.label?.ingredientStatement || i.label);
                  return (
                    <tr key={i.id}>
                      <Td>
                        <div className="font-medium">{i.name}</div>
                        <div className="font-mono text-xs text-muted">{i.sku}</div>
                      </Td>
                      <Td>
                        {started ? (
                          <Badge tone="ok">Ready</Badge>
                        ) : (
                          <Badge tone="neutral">Not started</Badge>
                        )}
                      </Td>
                      <Td>
                        {hasFoodVegMark(veg) ? (
                          veg
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </Td>
                      <Td>
                        {i.label ? (
                          <Link
                            href={`/masters/labelling/${i.id}`}
                            className="text-sm font-semibold text-saffron hover:underline"
                          >
                            Edit
                          </Link>
                        ) : (
                          <ActionForm action={ensureItemLabel.bind(null, i.id)}>
                            <SubmitButton>Start label</SubmitButton>
                          </ActionForm>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <ListPager basePath="/masters/labelling" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
