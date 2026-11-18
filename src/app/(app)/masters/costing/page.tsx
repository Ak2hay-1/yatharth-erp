import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FINANCE, MANAGEMENT, can } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, Empty } from "@/components/ui";
import { ListPager } from "@/components/list-pager";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage } from "@/lib/list-page";
import { money } from "@/lib/utils";
import { getCompanyMarkups, itemUnitCostMap, shownCosting } from "@/server/costing";

export default async function CostingListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireRole(FINANCE);
  const canEdit = can(user.role, MANAGEMENT);
  const page = parsePage((await searchParams).page);
  const query = { page: String(page) };
  const where = { type: "FINISHED" as const, isActive: true };

  const [total, items] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      orderBy: { name: "asc" },
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);
  const [costs, company] = await Promise.all([
    itemUnitCostMap(
      prisma,
      items.map((i) => i.id),
    ),
    getCompanyMarkups(),
  ]);
  const rows = items.map((item) => ({ item, cost: shownCosting(item, costs.get(item.id) ?? 0, company) }));
  const missingPrices = rows.some((row) => row.cost.missingPurchasePrices);

  return (
    <div>
      <PageHeader
        title="Product costing"
        subtitle="Manufacturing cost, unit selling price (USP = B2B ÷ pieces), and channel packet rates."
      />
      {missingPrices ? (
        <p className="mb-4 text-sm text-muted">
          Ingredient purchase prices are ₹0, so manufacturing cost stays ₹0 until those prices are set (enter on the
          item, or confirm a GRN with a rate). Where USP/B2B are also blank, the Items master selling price is shown as
          a fallback.
        </p>
      ) : null}
      <Card className="p-2">
        {rows.length === 0 ? (
          <Empty>No finished goods yet.</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>SKU</Th>
                  <Th>Mfg cost</Th>
                  <Th>USP (unit)</Th>
                  <Th>B2B (pkt)</Th>
                  <Th>Wholesale</Th>
                  <Th>Distributor</Th>
                  <Th>MRP</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item: i, cost }) => (
                  <tr key={i.id}>
                    <Td>
                      <div className="font-medium">{i.name}</div>
                      <div className="font-mono text-xs text-muted">{i.sku}</div>
                    </Td>
                    <Td>{money(cost.mfgCost)}</Td>
                    <Td>{money(cost.usp)}</Td>
                    <Td>{money(cost.rateB2b)}</Td>
                    <Td>{money(cost.rateWholesale)}</Td>
                    <Td>{money(cost.rateDistributor)}</Td>
                    <Td>{money(cost.rateMrp)}</Td>
                    <Td>
                      <Link
                        href={`/masters/costing/${i.id}`}
                        className="text-sm font-semibold text-saffron hover:underline"
                      >
                        {canEdit ? "Edit" : "View"}
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPager basePath="/masters/costing" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
