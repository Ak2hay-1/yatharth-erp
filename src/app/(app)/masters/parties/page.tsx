import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can, MANAGEMENT } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, LinkButton, Badge, Empty } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { ListPager, SortLink } from "@/components/list-pager";
import { parseListQuery } from "@/lib/filters";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage, parseSortDir, parseSortKey } from "@/lib/list-page";
import { BUYER_CLUSTERS, labelOf, PARTY_LIFECYCLES } from "@/lib/labels";

const SORT_KEYS = ["name", "kind", "lifecycle", "creditLimit"] as const;

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; dir?: string; inactive?: string }>;
}) {
  const user = await requireUser();
  const canManage = can(user.role, MANAGEMENT);
  const sp = await searchParams;
  const { q } = parseListQuery(sp);
  const page = parsePage(sp.page);
  const sort = parseSortKey(sp.sort, SORT_KEYS, "name");
  const dir = parseSortDir(sp.dir === "desc" ? "desc" : sp.sort ? sp.dir : "asc");
  const includeInactive = sp.inactive === "1";
  const query = { q, sort, dir, page: String(page), inactive: includeInactive ? "1" : undefined };
  const where: Prisma.PartyWhereInput = {
    ...(includeInactive ? {} : { isActive: true }),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { gstin: { contains: q } },
            { phone: { contains: q } },
            { city: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, parties] = await Promise.all([
    prisma.party.count({ where }),
    prisma.party.findMany({
      where,
      orderBy: { [sort]: dir } as Prisma.PartyOrderByWithRelationInput,
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

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
          <Empty>{q ? `No parties match “${q}”.` : "No parties yet."}</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>
                    <SortLink
                      basePath="/masters/parties"
                      query={query}
                      sortKey="name"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Name
                    </SortLink>
                  </Th>
                  <Th>
                    <SortLink
                      basePath="/masters/parties"
                      query={query}
                      sortKey="kind"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Kind
                    </SortLink>
                  </Th>
                  <Th>Cluster</Th>
                  <Th>
                    <SortLink
                      basePath="/masters/parties"
                      query={query}
                      sortKey="lifecycle"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Lifecycle
                    </SortLink>
                  </Th>
                  <Th>GSTIN</Th>
                  <Th>
                    <SortLink
                      basePath="/masters/parties"
                      query={query}
                      sortKey="creditLimit"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Credit
                    </SortLink>
                  </Th>
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
                    <Td>{p.kind === "SUPPLIER" ? "—" : labelOf(BUYER_CLUSTERS, p.cluster)}</Td>
                    <Td>
                      {p.kind === "SUPPLIER"
                        ? p.isActive
                          ? "Supplier"
                          : "Inactive"
                        : labelOf(PARTY_LIFECYCLES, p.lifecycle)}
                    </Td>
                    <Td>{p.gstin || "—"}</Td>
                    <Td>{p.creditLimit || "—"}</Td>
                    <Td>
                      {p.nextReorderDate
                        ? new Date(p.nextReorderDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPager basePath="/masters/parties" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
