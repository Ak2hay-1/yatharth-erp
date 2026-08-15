"use client";

import { useMemo, useState } from "react";
import { Field, Input } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { LineEditor, type CatalogItem, type LineRow } from "@/components/line-editor";
import { SearchableSelect } from "@/components/searchable-select";
import { SubmitButton } from "@/components/submit-button";
import { addDays, toInputDate } from "@/lib/utils";

export type PoForGrn = {
  id: string;
  number: string;
  supplierName: string;
  lines: {
    itemId: string;
    qty: number;
    rate: number;
    shelfLifeDays: number;
    item: CatalogItem;
  }[];
};

export function GrnForm({
  pos,
  defaultPoId,
  action,
}: {
  pos: PoForGrn[];
  defaultPoId?: string;
  action: (formData: FormData) => Promise<unknown>;
}) {
  const [poId, setPoId] = useState(defaultPoId && pos.some((p) => p.id === defaultPoId) ? defaultPoId : pos[0]?.id ?? "");
  const selected = pos.find((p) => p.id === poId) ?? pos[0];
  const today = toInputDate();

  const items = selected?.lines.map((l) => l.item) ?? [];
  const initial: LineRow[] = useMemo(() => {
    if (!selected) return [];
    return selected.lines
      .filter((l) => l.qty > 0.0005)
      .map((l) => ({
        itemId: l.itemId,
        qty: String(l.qty),
        rate: String(l.rate),
        lotNo: `RM-${today.replaceAll("-", "")}`,
        mfgDate: today,
        expiryDate: toInputDate(addDays(new Date(), l.shelfLifeDays)),
      }));
  }, [selected, today]);

  if (!selected) {
    return <p className="text-sm text-muted">Confirm a purchase order first, then receive it here.</p>;
  }

  return (
    <ActionForm action={action} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Purchase order">
          <SearchableSelect
            name="poId"
            value={poId}
            onChange={setPoId}
            required
            options={pos.map((p) => ({
              id: p.id,
              label: `${p.number} — ${p.supplierName}`,
            }))}
            placeholder="Search PO"
          />
        </Field>
        <Field label="Date">
          <Input name="date" type="date" required defaultValue={today} />
        </Field>
        <Field label="Notes">
          <Input name="notes" />
        </Field>
      </div>
      <LineEditor key={poId} items={items} initial={initial} rateField="purchasePrice" showLot canCreate={false} />
      <p className="text-xs text-muted">
        Qty defaults to what is still open on the PO. Confirming a partial GRN leaves the PO open.
      </p>
      <SubmitButton>Save draft GRN</SubmitButton>
    </ActionForm>
  );
}
