"use client";

import { useEffect, useState } from "react";
import { Field, Input } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { LineEditor, type CatalogItem } from "@/components/line-editor";
import { CreatablePartySelect } from "@/components/creatable-selects";
import { SubmitButton } from "@/components/submit-button";
import { toInputDate } from "@/lib/utils";
import type { StockHint } from "@/server/stock";

export function CounterSaleForm({
  customers,
  items,
  stockHints,
  action,
  canCreate = false,
}: {
  customers: { id: string; name: string }[];
  items: CatalogItem[];
  stockHints: Record<string, StockHint>;
  action: (formData: FormData) => Promise<unknown>;
  canCreate?: boolean;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F9") {
        e.preventDefault();
        (document.getElementById("counter-sale-form") as HTMLFormElement | null)?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ActionForm action={action} className="space-y-5" id="counter-sale-form">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Customer">
          <CreatablePartySelect
            name="customerId"
            value={customerId}
            onChange={setCustomerId}
            required
            options={customers.map((c) => ({ id: c.id, label: c.name }))}
            placeholder="Type customer"
            canCreate={canCreate}
            defaultKind="CUSTOMER"
            createLabel="Add new customer"
          />
        </Field>
        <Field label="Date">
          <Input name="date" type="date" required defaultValue={toInputDate()} />
        </Field>
        <Field label="Notes">
          <Input name="notes" placeholder="Walk-in / phone" />
        </Field>
      </div>
      <LineEditor items={items} showStock stockHints={stockHints} canCreate={canCreate} defaultType="FINISHED" />
      <SubmitButton>Bill & print invoice (F9)</SubmitButton>
    </ActionForm>
  );
}
