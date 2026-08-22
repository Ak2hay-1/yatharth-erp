import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, money, qty } from "@/lib/utils";

export default async function ProductionBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await prisma.productionBatch.findUnique({
    where: { id },
    include: { workOrder: { include: { recipe: { include: { finishedItem: true } } } } },
  });
  if (!row) notFound();
  const planned = row.workOrder.plannedQty;
  const yieldPct = planned > 0 ? Math.round((row.outputQty / planned) * 1000) / 10 : 0;
  return (
    <div>
      <PageHeader title={row.number} actions={<StatusBadge status={row.status} />} />
      <Card className="max-w-lg space-y-2 p-6 text-sm">
        <p>
          <span className="text-muted">Work order</span>{" "}
          <a className="text-saffron" href={`/production/orders/${row.workOrderId}`}>
            {row.workOrder.number}
          </a>
        </p>
        <p>
          <span className="text-muted">Product</span> {row.workOrder.recipe.finishedItem.name}
        </p>
        <p>
          <span className="text-muted">Lot</span> {row.lotNo}
        </p>
        <p>
          <span className="text-muted">Good output</span> {qty(row.outputQty, row.workOrder.recipe.finishedItem.unit)}
        </p>
        <p>
          <span className="text-muted">Wastage</span> {qty(row.wastageQty)}
        </p>
        <p>
          <span className="text-muted">QC reject</span> {qty(row.rejectQty)}
        </p>
        <p>
          <span className="text-muted">Yield vs plan</span> {yieldPct}%
        </p>
        <p>
          <span className="text-muted">Batch cost</span> {money(row.totalCost)} ({money(row.unitCost)} / unit)
        </p>
        <p>
          <span className="text-muted">Operator</span> {row.operator || "—"}
        </p>
        <p>
          <span className="text-muted">Actual weight</span> {row.actualWeight != null ? `${row.actualWeight} g` : "—"}
        </p>
        <p>
          <span className="text-muted">Coating OK</span> {row.coatingOk ? "Yes" : "No"}
        </p>
        <p>
          <span className="text-muted">BMR notes</span> {row.bmrNotes || "—"}
        </p>
        <p>
          <span className="text-muted">Mfg / expiry</span> {formatDate(row.mfgDate)} → {formatDate(row.expiryDate)}
        </p>
        {row.notes ? (
          <p>
            <span className="text-muted">Notes</span> {row.notes}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
