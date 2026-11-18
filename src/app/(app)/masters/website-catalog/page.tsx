import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { can, MANAGEMENT, SUPER_ADMIN_ONLY } from "@/lib/permissions";
import { Badge, Card, Empty, LinkButton, PageHeader, Table, Td, Th } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { ListPager } from "@/components/list-pager";
import { parseListQuery } from "@/lib/filters";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage } from "@/lib/list-page";
import { labelOf, PRODUCT_LANES, SKU_TIERS } from "@/lib/labels";
import { money, formatDateTime } from "@/lib/utils";
import { readWebsiteSyncSettings } from "@/lib/website-sync";
import { hasFoodVegMark, resolveVegMark } from "@/lib/veg-mark";

export default async function WebsiteCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireRole(MANAGEMENT);
  const canPublish = can(user.role, SUPER_ADMIN_ONLY);
  const sp = await searchParams;
  const { q } = parseListQuery(sp);
  const page = parsePage(sp.page);
  const query = { q, page: String(page) };
  const where: Prisma.ItemWhereInput = {
    type: "FINISHED",
    isActive: true,
    ...(q
      ? {
          OR: [{ sku: { contains: q } }, { name: { contains: q } }],
        }
      : {}),
  };

  const [total, items, sync] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      orderBy: [{ tier: "asc" }, { name: "asc" }],
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
      include: {
        label: { select: { vegNonVeg: true } },
        productAssets: {
          where: { mimeType: { startsWith: "image/" } },
          select: { id: true },
          take: 1,
        },
      },
    }),
    readWebsiteSyncSettings(),
  ]);

  return (
    <div>
      <PageHeader
        title="Website catalog"
        subtitle="Add finished products with pack shots and website prices in one place."
        actions={<LinkButton href="/masters/website-catalog/new">Add catalog product</LinkButton>}
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Website sync</p>
            <p className="mt-1 text-sm text-ink">
              {sync.enabled ? <Badge tone="ok">Enabled</Badge> : <Badge tone="draft">Off</Badge>}{" "}
              {sync.lastStatus ? <span className="text-muted">· {sync.lastStatus}</span> : null}
            </p>
            <p className="mt-1 text-xs text-muted">
              Last publish: {sync.lastPublishAt ? formatDateTime(sync.lastPublishAt) : "—"}
              {sync.lastError ? <span className="text-bad"> · {sync.lastError}</span> : null}
            </p>
          </div>
          {canPublish ? (
            <LinkButton href="/settings" variant="secondary">
              Publish in Settings
            </LinkButton>
          ) : (
            <p className="text-xs text-muted">Ask a Super Admin to publish from Settings.</p>
          )}
        </div>
      </Card>

      <Card className="p-2">
        <ListFilters q={q} placeholder="SKU or name" />
        {items.length === 0 ? (
          <Empty>{q ? `No catalog products match “${q}”.` : "No finished products yet."}</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>SKU</Th>
                  <Th>Name</Th>
                  <Th>Lane</Th>
                  <Th>Tier</Th>
                  <Th>USP</Th>
                  <Th>B2B</Th>
                  <Th>Ready</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const hasPhoto = item.productAssets.length > 0;
                  const hasPrice = item.usp > 0 || item.rateB2b > 0 || item.sellingPrice > 0;
                  const veg = resolveVegMark(item.label?.vegNonVeg, item.lane, item);
                  const hasVeg = hasFoodVegMark(veg);
                  const ready = hasPhoto && hasPrice && hasVeg;
                  return (
                    <tr key={item.id}>
                      <Td>
                        <Link
                          href={`/masters/website-catalog/${item.id}`}
                          className="font-medium hover:text-saffron"
                        >
                          {item.sku}
                        </Link>
                      </Td>
                      <Td>{item.name}</Td>
                      <Td>{labelOf(PRODUCT_LANES, item.lane)}</Td>
                      <Td>{labelOf(SKU_TIERS, item.tier)}</Td>
                      <Td>{money(item.usp || item.sellingPrice)}</Td>
                      <Td>{money(item.rateB2b || item.sellingPrice)}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={hasPhoto ? "ok" : "draft"}>{hasPhoto ? "Photo" : "No photo"}</Badge>
                          <Badge tone={hasPrice ? "ok" : "draft"}>{hasPrice ? "Price" : "No price"}</Badge>
                          <Badge tone={hasVeg ? "ok" : "draft"}>{hasVeg ? "Veg mark" : "No veg"}</Badge>
                          {ready ? <Badge tone="ok">Ready</Badge> : null}
                        </div>
                      </Td>
                      <Td>
                        {item.isActive ? <Badge tone="ok">Active</Badge> : <Badge tone="draft">Hidden</Badge>}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <ListPager basePath="/masters/website-catalog" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
