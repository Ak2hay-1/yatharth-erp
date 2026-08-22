import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can, MANAGEMENT } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, LinkButton, Badge, Empty } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { parseListQuery } from "@/lib/filters";
import { BUYER_CLUSTERS, labelOf, PARTY_LIFECYCLES } from "@/lib/labels";

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const canManage = can(user.role, MANAGEMENT);
  const { q } = parseListQuery(await searchParams);
  const parties = await prisma.party.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { gstin: { contains: q } },
            { phone: { contains: q } },
            { city: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <PageHeader
        title="Customers & suppliers"
        subtitle="QSR, hotels, caterers, distributors and vendors."
        actions={canManage ? <LinkButton href="/masters/parties/new">New party</LinkButton> : undefined}
      />
      <Card className="p-2">
        <ListFilters q={q} placeholder="Name, GSTIN, phone, city" />
        {parties.length === 0 ? (
          <Empty>No parties match.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Kind</Th>
                <Th>Cluster</Th>
                <Th>Lifecycle</Th>
                <Th>GSTIN</Th>
                <Th>Credit</Th>
                <Th>Next reorder</Th>
              </tr>
            </thead>
            <tbody>
              {parties.map((p) => (
                <tr key={p.id}>
                  <Td>
                    {canManage ? (
                      <Link href={`/masters/parties/${p.id}`} className="font-medium hover:text-saffron">
                        {p.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{p.name}</span>
                    )}
                  </Td>
                  <Td>
                    <Badge>{p.kind}</Badge>
                  </Td>
                  <Td>{labelOf(BUYER_CLUSTERS, p.cluster)}</Td>
                  <Td>{labelOf(PARTY_LIFECYCLES, p.lifecycle)}</Td>
                  <Td>{p.gstin || "—"}</Td>
                  <Td>{p.creditLimit || "—"}</Td>
                  <Td>
                    {p.nextReorderDate
                      ? new Date(p.nextReorderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                      : "—"}
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
