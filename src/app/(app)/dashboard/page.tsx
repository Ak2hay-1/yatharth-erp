import Link from "next/link";
import { AlertTriangle, Factory, IndianRupee, PackageMinus, Repeat, Target } from "lucide-react";
import { Card, PageHeader, Table, Td, Th, Empty, Badge, Field, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { getDashboard } from "@/server/dashboard";
import { getMentorKpis } from "@/server/kpis";
import { saveMonthlyReview } from "@/server/complaints";
import { formatDate, money, qty } from "@/lib/utils";
import { KPI_TARGETS } from "@/lib/labels";
import { isSyncConfigured, readSyncConfig } from "@/lib/sync/config";

function tone(ok: boolean) {
  return ok ? ("ok" as const) : ("bad" as const);
}

export default async function DashboardPage() {
  const [d, k] = await Promise.all([getDashboard(), getMentorKpis()]);
  const sync = readSyncConfig();
  const syncLive = isSyncConfigured(sync) && !sync.lastError;
  const t = k.targets;

  return (
    <div>
      <PageHeader
        title="Mentor operating dashboard"
        subtitle={`Month ${k.monthKey} · sales → contribution → receivables · on track for ${KPI_TARGETS.newCustomersPerMonth} new B2B customers?`}
        actions={
          sync.enabled ? (
            <Badge tone={syncLive ? "ok" : sync.lastError ? "warn" : "draft"}>
              Website sync {syncLive ? "OK" : sync.lastError ? "Error" : "Pending"}
            </Badge>
          ) : null
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<IndianRupee size={18} />}
          label="Sales (commercial)"
          value={money(k.salesTotal)}
          hint={`Contribution ${money(k.contribution)}`}
        />
        <Kpi
          icon={<Target size={18} />}
          label="Contribution %"
          value={`${k.contributionPct.toFixed(1)}%`}
          hint={`Target ≥ ${t.contributionPct}%`}
          badge={tone(k.contributionPct >= t.contributionPct || k.salesTotal === 0)}
        />
        <Kpi
          icon={<Factory size={18} />}
          label="Production yield"
          value={`${k.yieldPct.toFixed(1)}%`}
          hint={`Target > ${t.yieldPct}%`}
          badge={tone(k.yieldPct >= t.yieldPct || k.yieldPct === 0)}
        />
        <Kpi
          icon={<Repeat size={18} />}
          label="Repeat-order rate"
          value={`${k.repeatPct.toFixed(1)}%`}
          hint={`Target > ${t.repeatPct}%`}
          badge={tone(k.repeatPct >= t.repeatPct || k.repeatPct === 0)}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<AlertTriangle size={18} />}
          label="Rejection %"
          value={`${k.rejectionPct.toFixed(1)}%`}
          hint={`Target < ${t.rejectionPct}%`}
          badge={tone(k.rejectionPct <= t.rejectionPct)}
        />
        <Kpi
          icon={<PackageMinus size={18} />}
          label="Wastage %"
          value={`${k.wastagePct.toFixed(1)}%`}
          hint={`Target < ${t.wastagePct}%`}
          badge={tone(k.wastagePct <= t.wastagePct)}
        />
        <Kpi
          icon={<AlertTriangle size={18} />}
          label="Complaints %"
          value={`${k.complaintPct.toFixed(1)}%`}
          hint={`Target < ${t.complaintPct}%`}
          badge={tone(k.complaintPct <= t.complaintPct)}
        />
        <Kpi
          icon={<Target size={18} />}
          label="On-time delivery"
          value={`${k.onTimePct.toFixed(1)}%`}
          hint={`Target > ${t.onTimePct}%`}
          badge={tone(k.onTimePct >= t.onTimePct)}
        />
      </div>

      <Card className="mb-6 p-5">
        <h2 className="font-display mb-3 text-xl">Monthly mentor questions</h2>
        <ol className="grid gap-2 text-sm md:grid-cols-2">
          <li>01 Sold: <strong>{money(k.salesTotal)}</strong></li>
          <li>02 Earned (contribution): <strong>{money(k.contribution)}</strong> ({k.contributionPct.toFixed(1)}%)</li>
          <li>03 Top 5 by contribution: <strong>{k.topContribution.map((x) => x.item.name).slice(0, 3).join(", ") || "—"}</strong></li>
          <li>04 Discontinue candidates: <strong>{k.discontinue.length}</strong></li>
          <li>05 New B2B leads: <strong>{k.newLeads}</strong></li>
          <li>06 Samples out: <strong>{k.samplesOut}</strong></li>
          <li>07 Sample → order: <strong>{k.sampleConversionPct.toFixed(0)}%</strong></li>
          <li>08 Reorder rate: <strong>{k.repeatPct.toFixed(0)}%</strong></li>
          <li>09 Missed reorders: <strong>{k.noReorder.length}</strong></li>
          <li>10 New customers MTD: <strong>{k.newCustomers} / {t.newCustomersPerMonth}</strong></li>
        </ol>
        <form action={saveMonthlyReview} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="month" value={k.monthKey} />
          <Field label="10. What single system should we improve next month?">
            <Input name="systemToImprove" defaultValue={k.review?.systemToImprove ?? ""} placeholder="Cold chain / costing / sampling…" />
          </Field>
          <Field label="Notes">
            <Textarea name="notes" defaultValue={k.review?.notes ?? ""} />
          </Field>
          <div>
            <SubmitButton>Save monthly focus</SubmitButton>
          </div>
        </form>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<IndianRupee size={18} />} label="Sales today" value={money(d.todaySales)} hint={`${d.todayInvoiceCount} invoices`} />
        <Kpi icon={<Factory size={18} />} label="Produced today" value={qty(d.todayProductionQty)} hint={`${d.todayProductionCount} batches`} />
        <Kpi icon={<PackageMinus size={18} />} label="Low stock" value={String(d.low.length)} hint="At or below reorder" />
        <Kpi icon={<AlertTriangle size={18} />} label="Expiring in 7 days" value={String(d.expiring7.length)} hint={`${d.expiring30.length} within 30 days`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display mb-3 text-xl">Top contribution SKUs</h2>
          {k.topContribution.length === 0 ? (
            <Empty>No commercial sales this month.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>SKU</Th>
                  <Th>Contribution</Th>
                  <Th>%</Th>
                </tr>
              </thead>
              <tbody>
                {k.topContribution.map((row) => (
                  <tr key={row.item.id}>
                    <Td>{row.item.name}</Td>
                    <Td>{money(row.contribution)}</Td>
                    <Td>
                      <Badge tone={row.contributionPct >= t.contributionPct ? "ok" : "bad"}>
                        {row.contributionPct.toFixed(1)}%
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display mb-3 text-xl">Credit risk</h2>
          {k.overLimit.length === 0 && k.overdue.length === 0 ? (
            <Empty>No over-limit or overdue invoices.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Customer / invoice</Th>
                  <Th>Due</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {k.overLimit.map((c) => (
                  <tr key={c.name}>
                    <Td>{c.name}</Td>
                    <Td>{money(c.due)}</Td>
                    <Td>
                      <Badge tone="bad">Over limit {money(c.limit)}</Badge>
                    </Td>
                  </tr>
                ))}
                {k.overdue.slice(0, 8).map((i) => (
                  <tr key={i.id}>
                    <Td>
                      <Link href={`/sales/invoices/${i.id}`} className="font-medium hover:text-saffron">
                        {i.number}
                      </Link>
                      <div className="text-xs text-muted">{i.customer.name}</div>
                    </Td>
                    <Td>{money(i.due)}</Td>
                    <Td>
                      <Badge tone="warn">Overdue</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display mb-3 text-xl">Review to discontinue</h2>
          {k.discontinue.length === 0 ? (
            <Empty>No SKUs failing margin / yield / repeat gates.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>SKU</Th>
                  <Th>Why</Th>
                </tr>
              </thead>
              <tbody>
                {k.discontinue.map((row) => (
                  <tr key={row.item.id}>
                    <Td>
                      <Link href={`/masters/items/${row.item.id}`} className="hover:text-saffron">
                        {row.item.name}
                      </Link>
                    </Td>
                    <Td>{row.reasons.join(", ")}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display mb-3 text-xl">Missed reorders</h2>
          {k.noReorder.length === 0 ? (
            <Empty>All B2B accounts within cycle.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Reason</Th>
                </tr>
              </thead>
              <tbody>
                {k.noReorder.slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <Link href={`/masters/parties/${p.id}`} className="hover:text-saffron">
                        {p.name}
                      </Link>
                    </Td>
                    <Td>{p.lostReason || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display mb-3 text-xl">Low stock</h2>
          {d.low.length === 0 ? (
            <Empty>Nothing below reorder level.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Item</Th>
                  <Th>On hand</Th>
                  <Th>Reorder</Th>
                </tr>
              </thead>
              <tbody>
                {d.low.map((row) => (
                  <tr key={row.item.id}>
                    <Td>
                      <Link href="/inventory/stock" className="font-medium hover:text-saffron">
                        {row.item.name}
                      </Link>
                    </Td>
                    <Td>{qty(row.onHand, row.item.unit)}</Td>
                    <Td>{qty(row.item.reorderLevel, row.item.unit)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display mb-3 text-xl">Expiring soon</h2>
          {d.expiring7.length === 0 ? (
            <Empty>No batches expiring in 7 days.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Lot</Th>
                  <Th>Qty</Th>
                  <Th>Expiry</Th>
                </tr>
              </thead>
              <tbody>
                {d.expiring7.map((b) => (
                  <tr key={b.id}>
                    <Td>
                      <div className="font-medium">{b.item.name}</div>
                      <div className="text-xs text-muted">{b.lotNo}</div>
                    </Td>
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

function Kpi({
  icon,
  label,
  value,
  hint,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  badge?: "ok" | "bad";
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex rounded-lg bg-forest/10 p-2 text-forest">{icon}</div>
        {badge ? <Badge tone={badge}>{badge === "ok" ? "On track" : "Off"}</Badge> : null}
      </div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="font-display mt-1 text-2xl">{value}</div>
      <div className="mt-1 text-xs text-muted">{hint}</div>
    </Card>
  );
}
