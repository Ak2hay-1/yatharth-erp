import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, Field, Input, PageHeader, Table, Td, Th, StatusBadge, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { produceBatch } from "@/server/production";
import { getStockHints } from "@/server/stock";
import { ActionForm } from "@/components/action-form";
import { addDays, formatDate, qty, toInputDate } from "@/lib/utils";

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wo = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      recipe: { include: { finishedItem: true, lines: { include: { item: true } } } },
      batches: true,
    },
  });
  if (!wo) notFound();
  const scale = wo.recipe.outputQty > 0 ? wo.plannedQty / wo.recipe.outputQty : 1;
  const today = toInputDate();
  const stockHints = await getStockHints();
  return (
    <div>
      <PageHeader
        title={wo.number}
        subtitle={`${wo.recipe.finishedItem.name} · planned ${qty(wo.plannedQty, wo.recipe.finishedItem.unit)}`}
        actions={<StatusBadge status={wo.status} />}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display mb-3 text-xl">Ingredients to consume</h2>
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th>Per batch</Th>
                <Th>This WO</Th>
                <Th>On hand</Th>
              </tr>
            </thead>
            <tbody>
              {wo.recipe.lines.map((l) => {
                const need = l.qty * scale;
                const onHand = stockHints[l.itemId]?.onHand ?? 0;
                const short = need > onHand + 0.0005;
                return (
                  <tr key={l.id}>
                    <Td>{l.item.name}</Td>
                    <Td>{qty(l.qty, l.item.unit)}</Td>
                    <Td>{qty(need, l.item.unit)}</Td>
                    <Td className={short ? "font-semibold text-bad" : ""}>
                      {qty(onHand, l.item.unit)}
                      {short ? " short" : ""}
                      {stockHints[l.itemId]?.nearestExpiry
                        ? ` · exp ${formatDate(stockHints[l.itemId].nearestExpiry)}`
                        : ""}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
        {wo.status !== "COMPLETED" && wo.status !== "CANCELLED" ? (
          <Card className="p-5">
            <h2 className="font-display mb-3 text-xl">Produce batch</h2>
            <ActionForm action={produceBatch} className="space-y-3">
              <input type="hidden" name="workOrderId" value={wo.id} />
              <Field label="Lot no">
                <Input name="lotNo" required defaultValue={`FG-${today.replaceAll("-", "")}`} />
              </Field>
              <Field label="Actual good output">
                <Input name="outputQty" type="number" step="0.001" required defaultValue={wo.plannedQty} />
              </Field>
              <Field label="Wastage / yield loss">
                <Input name="wastageQty" type="number" step="0.001" defaultValue={0} />
              </Field>
              <Field label="QC reject qty">
                <Input name="rejectQty" type="number" step="0.001" defaultValue={0} />
              </Field>
              <Field label="Operator">
                <Input name="operator" placeholder="Name" />
              </Field>
              <Field label="Actual piece weight (g)">
                <Input name="actualWeight" type="number" step="0.01" />
              </Field>
              <Field label="Coating OK">
                <Select name="coatingOk" defaultValue="true">
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </Field>
              <Field label="BMR notes">
                <Input name="bmrNotes" placeholder="Recipe version / process notes" />
              </Field>
              <Field label="Mfg date">
                <Input name="mfgDate" type="date" required defaultValue={today} />
              </Field>
              <Field label="Expiry">
                <Input
                  name="expiryDate"
                  type="date"
                  defaultValue={toInputDate(addDays(new Date(), wo.recipe.finishedItem.shelfLifeDays))}
                />
              </Field>
              <Field label="Notes">
                <Input name="notes" />
              </Field>
              <SubmitButton>Complete production</SubmitButton>
            </ActionForm>
          </Card>
        ) : (
          <Card className="p-5">
            <h2 className="font-display mb-3 text-xl">Batches</h2>
            {wo.batches.map((b) => (
              <p key={b.id} className="text-sm">
                <a className="text-saffron" href={`/production/batches/${b.id}`}>
                  {b.number}
                </a>{" "}
                · {qty(b.outputQty)} good · wastage {qty(b.wastageQty)} · {formatDate(b.mfgDate)}
              </p>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
