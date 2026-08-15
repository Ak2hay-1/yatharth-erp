import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, Empty, Badge, LinkButton } from "@/components/ui";
import { addDays, formatDate, money, qty } from "@/lib/utils";
import { getMentorKpis } from "@/server/kpis";
import { labelOf, WASTE_CAUSES } from "@/lib/labels";

function ExportLink({ kind, label = "Download CSV" }: { kind: string; label?: string }) {
  return (
    <LinkButton href={`/api/reports/${kind}`} variant="secondary">
      {label}
    </LinkButton>
  );
}

export default async function ReportsPage() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const in30 = addDays(start, 30);
  const kpis = await getMentorKpis();

  const [invoices, bills, batches, production, wasteMoves] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { customer: true },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.supplierBill.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { supplier: true },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.batch.findMany({
      where: { qtyOnHand: { gt: 0 }, expiryDate: { lte: in30 } },
      include: { item: true },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.productionBatch.findMany({
      include: { workOrder: { include: { recipe: { include: { finishedItem: true } } } } },
      orderBy: { mfgDate: "desc" },
      take: 50,
    }),
    prisma.stockMove.findMany({
      where: { type: "WASTE" },
      include: { item: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Contribution, yield, GST registers, expiry, wastage by cause and discontinue list."
        actions={<ExportLink kind="kpis" label="Export KPIs CSV" />}
      />
      <div className="space-y-6">
        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">Finance chain ({kpis.monthKey})</h2>
            <ExportLink kind="kpis" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
            <div>
              <div className="text-muted">Sales</div>
              <div className="font-semibold">{money(kpis.salesTotal)}</div>
            </div>
            <div>
              <div className="text-muted">Product cost</div>
              <div className="font-semibold">{money(kpis.cost)}</div>
            </div>
            <div>
              <div className="text-muted">Contribution</div>
              <div className="font-semibold">{money(kpis.contribution)} ({kpis.contributionPct.toFixed(1)}%)</div>
            </div>
            <div>
              <div className="text-muted">Receivables</div>
              <div className="font-semibold">{money(kpis.receivables)}</div>
            </div>
            <div>
              <div className="text-muted">New B2B customers</div>
              <div className="font-semibold">
                {kpis.newCustomers} / {kpis.targets.newCustomersPerMonth}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">SKU contribution & discontinue</h2>
            <ExportLink kind="discontinue" />
          </div>
          {kpis.skuRows.filter((s) => s.revenue > 0 || s.yieldPct > 0).length === 0 ? (
            <Empty>No SKU activity this month.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>SKU</Th>
                  <Th>Unit cost</Th>
                  <Th>Revenue</Th>
                  <Th>Contribution</Th>
                  <Th>Yield</Th>
                  <Th>Repeat</Th>
                  <Th>Flag</Th>
                </tr>
              </thead>
              <tbody>
                {kpis.skuRows
                  .filter((s) => s.revenue > 0 || s.item.tier === "HERO" || s.yieldPct > 0)
                  .map((s) => (
                    <tr key={s.item.id}>
                      <Td>
                        <Link href={`/masters/items/${s.item.id}`} className="hover:text-saffron">
                          {s.item.name}
                        </Link>
                        <div className="text-xs text-muted">{s.item.tier}</div>
                      </Td>
                      <Td>{money(s.unitCost)}</Td>
                      <Td>{money(s.revenue)}</Td>
                      <Td>
                        {money(s.contribution)} ({s.contributionPct.toFixed(1)}%)
                      </Td>
                      <Td>{s.yieldPct.toFixed(1)}%</Td>
                      <Td>{s.repeatPct.toFixed(1)}%</Td>
                      <Td>
                        {s.discontinue ? (
                          <Badge tone="bad">{s.reasons.join(", ")}</Badge>
                        ) : (
                          <Badge tone="ok">OK</Badge>
                        )}
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">Sales register (GSTR-1 style)</h2>
            <ExportLink kind="sales" />
          </div>
          {invoices.length === 0 ? (
            <Empty>No invoices.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Kind</Th>
                  <Th>Customer</Th>
                  <Th>GSTIN</Th>
                  <Th>Taxable</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <Td>
                      {i.number}
                      <div className="text-xs text-muted">{formatDate(i.date)}</div>
                    </Td>
                    <Td>{i.kind}</Td>
                    <Td>{i.customer.name}</Td>
                    <Td className="font-mono text-xs">{i.customer.gstin || "B2C"}</Td>
                    <Td>{money(i.taxable)}</Td>
                    <Td>{money(i.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">Purchase register</h2>
            <ExportLink kind="purchases" />
          </div>
          {bills.length === 0 ? (
            <Empty>No bills.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Bill</Th>
                  <Th>Supplier</Th>
                  <Th>Taxable</Th>
                  <Th>Tax</Th>
                  <Th>Total</Th>
                  <Th>Due</Th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id}>
                    <Td>
                      {b.number}
                      <div className="text-xs text-muted">{formatDate(b.date)}</div>
                    </Td>
                    <Td>{b.supplier.name}</Td>
                    <Td>{money(b.taxable)}</Td>
                    <Td>{money(b.cgst + b.sgst + b.igst)}</Td>
                    <Td>{money(b.total)}</Td>
                    <Td>{money(b.total - b.paid)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">Production yield / reject / cost</h2>
            <ExportLink kind="production" />
          </div>
          {production.length === 0 ? (
            <Empty>No production batches.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Batch</Th>
                  <Th>Product</Th>
                  <Th>Good</Th>
                  <Th>Waste</Th>
                  <Th>Reject</Th>
                  <Th>Yield</Th>
                  <Th>Unit cost</Th>
                </tr>
              </thead>
              <tbody>
                {production.map((p) => {
                  const planned = p.workOrder.plannedQty;
                  const y = planned > 0 ? Math.round((p.outputQty / planned) * 1000) / 10 : 0;
                  return (
                    <tr key={p.id}>
                      <Td>{p.number}</Td>
                      <Td>{p.workOrder.recipe.finishedItem.name}</Td>
                      <Td>{qty(p.outputQty)}</Td>
                      <Td>{qty(p.wastageQty)}</Td>
                      <Td>{qty(p.rejectQty)}</Td>
                      <Td>{y}%</Td>
                      <Td>{money(p.unitCost)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">Wastage by cause</h2>
            <ExportLink kind="waste" />
          </div>
          {wasteMoves.length === 0 ? (
            <Empty>No waste movements.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Item</Th>
                  <Th>Cause</Th>
                  <Th>Qty</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody>
                {wasteMoves.map((m) => (
                  <tr key={m.id}>
                    <Td>{formatDate(m.createdAt)}</Td>
                    <Td>{m.item.name}</Td>
                    <Td>{labelOf(WASTE_CAUSES, m.wasteCause ?? "OTHER")}</Td>
                    <Td>{qty(Math.abs(m.qty), m.item.unit)}</Td>
                    <Td className="text-xs text-muted">{m.notes}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">Expiry within 30 days</h2>
            <ExportLink kind="expiry" />
          </div>
          {batches.length === 0 ? (
            <Empty>No lots expiring soon.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Item</Th>
                  <Th>Lot</Th>
                  <Th>Qty</Th>
                  <Th>Expiry</Th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <Td>{b.item.name}</Td>
                    <Td className="font-mono text-xs">{b.lotNo}</Td>
                    <Td>{qty(b.qtyOnHand, b.item.unit)}</Td>
                    <Td>
                      <Badge tone="warn">{formatDate(b.expiryDate)}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
