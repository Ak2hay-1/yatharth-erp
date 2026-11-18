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
import { labelOf, PACK_TYPES, PRODUCT_LANES, SKU_TIERS } from "@/lib/labels";

const SORT_KEYS = ["sku", "name", "type", "gstRate", "sellingPrice"] as const;

export default async function ItemsPage({
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
  const where: Prisma.ItemWhereInput = {
    ...(includeInactive ? {} : { isActive: true }),
    ...(q
      ? {
          OR: [{ sku: { contains: q } }, { name: { contains: q } }, { hsn: { contains: q } }],
        }
      : {}),
  };
  const orderBy = { [sort]: dir } as Prisma.ItemOrderByWithRelationInput;

  const [total, items] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      orderBy: sort === "name" ? [{ type: "asc" }, { name: dir }] : orderBy,
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle="Raw materials, packing and finished SKUs. Hero / core / custom for finished goods."
        actions={canManage ? <LinkButton href="/masters/items/new">New item</LinkButton> : undefined}
      />
      <Card className="p-2">
        <ListFilters q={q} placeholder="SKU, name or HSN" />
        {items.length === 0 ? (
          <Empty>{q ? `No items match “${q}”.` : "No items yet."}</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>
                    <SortLink basePath="/masters/items" query={query} sortKey="sku" currentSort={sort} currentDir={dir}>
                      SKU
                    </SortLink>
                  </Th>
                  <Th>
                    <SortLink basePath="/masters/items" query={query} sortKey="name" currentSort={sort} currentDir={dir}>
                      Name
                    </SortLink>
                  </Th>
                  <Th>
                    <SortLink basePath="/masters/items" query={query} sortKey="type" currentSort={sort} currentDir={dir}>
                      Type
                    </SortLink>
                  </Th>
                  <Th>Lane</Th>
                  <Th>Tier</Th>
                  <Th>Pack</Th>
                  <Th>
                    <SortLink
                      basePath="/masters/items"
                      query={query}
                      sortKey="gstRate"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      GST
                    </SortLink>
                  </Th>
                  <Th>
                    <SortLink
                      basePath="/masters/items"
                      query={query}
                      sortKey="sellingPrice"
                      currentSort={sort}
                      currentDir={dir}
                    >
                      Sell
                    </SortLink>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <Td>
                      {canManage ? (
                        <Link href={`/masters/items/${item.id}`} className="font-medium hover:text-saffron">
                          {item.sku}
                        </Link>
                      ) : (
                        <span className="font-medium">{item.sku}</span>
                      )}
                    </Td>
                    <Td>{item.name}</Td>
                    <Td>
                      <Badge>{item.type}</Badge>
                    </Td>
                    <Td>{labelOf(PRODUCT_LANES, item.lane)}</Td>
                    <Td>{labelOf(SKU_TIERS, item.tier)}</Td>
                    <Td>{item.packSize || labelOf(PACK_TYPES, item.packType)}</Td>
                    <Td>{item.gstRate}%</Td>
                    <Td>{item.sellingPrice}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPager basePath="/masters/items" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
