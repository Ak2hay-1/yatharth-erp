import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, Empty } from "@/components/ui";
import { formatDate, money, qty } from "@/lib/utils";

export default async function ProductionBatchesPage() {
  const rows = await prisma.productionBatch.findMany({
    include: { workOrder: { include: { recipe: { include: { finishedItem: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader title="Production batches" />
      <Card className="p-2">
        {rows.length === 0 ? (
          <Empty>No production yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Product</Th>
                <Th>Lot</Th>
                <Th>Output</Th>
                <Th>Waste</Th>
                <Th>Reject</Th>
                <Th>Unit cost</Th>
                <Th>Mfg</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <Link href={`/production/batches/${r.id}`} className="font-medium hover:text-saffron">
                      {r.number}
                    </Link>
                  </Td>
                  <Td>{r.workOrder.recipe.finishedItem.name}</Td>
                  <Td className="font-mono text-xs">{r.lotNo}</Td>
                  <Td>{qty(r.outputQty)}</Td>
                  <Td>{qty(r.wastageQty)}</Td>
                  <Td>{qty(r.rejectQty)}</Td>
                  <Td>{money(r.unitCost)}</Td>
                  <Td>{formatDate(r.mfgDate)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
