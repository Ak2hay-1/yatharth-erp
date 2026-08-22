import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, Empty, Badge } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { ensureItemLabel } from "@/server/labelling";

export default async function LabellingListPage() {
  await requireRole(MANAGEMENT);
  const items = await prisma.item.findMany({
    where: { type: "FINISHED", isActive: true },
    include: { label: true },
    orderBy: { name: "asc" },
  });

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
              {items.map((i) => (
                <tr key={i.id}>
                  <Td>
                    <div className="font-medium">{i.name}</div>
                    <div className="font-mono text-xs text-muted">{i.sku}</div>
                  </Td>
                  <Td>
                    {i.label?.ingredientStatement || i.label ? (
                      <Badge tone="ok">Ready</Badge>
                    ) : (
                      <Badge tone="neutral">Not started</Badge>
                    )}
                  </Td>
                  <Td>{i.label?.vegNonVeg ?? "—"}</Td>
                  <Td>
                    {i.label ? (
                      <Link href={`/masters/labelling/${i.id}`} className="text-sm font-semibold text-saffron hover:underline">
                        Edit
                      </Link>
                    ) : (
                      <ActionForm action={ensureItemLabel.bind(null, i.id)}>
                        <SubmitButton>Start label</SubmitButton>
                      </ActionForm>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
