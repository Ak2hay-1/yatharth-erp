import { Card, PageHeader } from "@/components/ui";
import { GrnForm } from "@/components/grn-form";
import { createGoodsReceipt } from "@/server/purchase";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OPS } from "@/lib/permissions";

export default async function NewGrnPage({
  searchParams,
}: {
  searchParams: Promise<{ poId?: string }>;
}) {
  await requireRole(OPS);
  const { poId } = await searchParams;
  const pos = await prisma.purchaseOrder.findMany({
    where: { status: "CONFIRMED" },
    include: {
      supplier: true,
      lines: { include: { item: true } },
      receipts: { where: { status: "CONFIRMED" }, include: { lines: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const payload = pos
    .map((p) => {
      const received: Record<string, number> = {};
      for (const r of p.receipts) {
        for (const l of r.lines) received[l.itemId] = (received[l.itemId] ?? 0) + l.qty;
      }
      const lines = p.lines
        .map((l) => ({
          itemId: l.itemId,
          qty: Math.max(0, l.qty - (received[l.itemId] ?? 0)),
          rate: l.rate,
          shelfLifeDays: l.item.shelfLifeDays,
          item: l.item,
        }))
        .filter((l) => l.qty > 0.0005);
      return {
        id: p.id,
        number: p.number,
        supplierName: p.supplier.name,
        lines,
      };
    })
    .filter((p) => p.lines.length > 0);

  return (
    <div>
      <PageHeader
        title="New goods receipt"
        subtitle="Qty defaults to what is still open. Changing PO reloads lines. Partial GRN leaves the PO open."
      />
      <Card className="p-6">
        {payload.length === 0 ? (
          <p className="text-sm text-muted">No open purchase orders. Confirm a PO, or remaining qty is already received.</p>
        ) : (
          <GrnForm pos={payload} defaultPoId={poId} action={createGoodsReceipt} />
        )}
      </Card>
    </div>
  );
}
