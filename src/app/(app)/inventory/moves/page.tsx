import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, Empty } from "@/components/ui";
import { formatDate, qty } from "@/lib/utils";

export default async function MovesPage() {
  const moves = await prisma.stockMove.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
    include: { item: true, batch: true },
  });
  return (
    <div>
      <PageHeader title="Stock movements" subtitle="Every in and out is recorded." />
      <Card className="p-2">
        {moves.length === 0 ? (
          <Empty>No movements yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Item</Th>
                <Th>Lot</Th>
                <Th>Type</Th>
                <Th>Cause</Th>
                <Th>Qty</Th>
                <Th>Ref</Th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <Td>{formatDate(m.createdAt)}</Td>
                  <Td>{m.item.name}</Td>
                  <Td className="font-mono text-xs">{m.batch.lotNo}</Td>
                  <Td>{m.type}</Td>
                  <Td className="text-xs">{m.wasteCause ?? "—"}</Td>
                  <Td className={m.qty < 0 ? "text-bad" : "text-ok"}>{qty(m.qty, m.item.unit)}</Td>
                  <Td className="text-xs text-muted">
                    {m.refType} {m.notes}
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
