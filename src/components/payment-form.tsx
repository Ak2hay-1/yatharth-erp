"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { CreatablePartySelect } from "@/components/creatable-selects";
import { money, toInputDate } from "@/lib/utils";

type Doc = { id: string; number: string; total: number; paid: number; label: string };

export function PaymentFields({
  action,
  direction,
  parties,
  docsByParty,
  defaultPartyId,
  canCreate = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  direction: "IN" | "OUT";
  parties: { id: string; name: string }[];
  docsByParty: Record<string, Doc[]>;
  defaultPartyId?: string;
  canCreate?: boolean;
}) {
  const [partyId, setPartyId] = useState(defaultPartyId && parties.some((p) => p.id === defaultPartyId) ? defaultPartyId : parties[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const docs = docsByParty[partyId] ?? [];
  const [alloc, setAlloc] = useState<Record<string, string>>({});

  function autoAllocate(total: number) {
    let left = total;
    const next: Record<string, string> = {};
    for (const d of docs) {
      const due = Math.max(0, d.total - d.paid);
      const take = Math.min(due, left);
      next[d.id] = take ? String(Math.round(take * 100) / 100) : "";
      left = Math.round((left - take) * 100) / 100;
      if (left <= 0) break;
    }
    setAlloc(next);
  }

  const payload = docs
    .map((d) => ({ id: d.id, amount: Number(alloc[d.id] || 0) }))
    .filter((a) => a.amount > 0);

  return (
    <ActionForm action={action} className="space-y-4">
      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="allocations" value={JSON.stringify(payload)} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={direction === "IN" ? "Customer" : "Supplier"}>
          <CreatablePartySelect
            name="partyId"
            value={partyId}
            onChange={(id) => {
              setPartyId(id);
              setAlloc({});
            }}
            required
            options={parties.map((p) => ({ id: p.id, label: p.name }))}
            placeholder="Type name"
            canCreate={canCreate}
            defaultKind={direction === "IN" ? "CUSTOMER" : "SUPPLIER"}
            createLabel={direction === "IN" ? "Add new customer" : "Add new supplier"}
          />
        </Field>
        <Field label="Date">
          <Input name="date" type="date" required defaultValue={toInputDate()} />
        </Field>
        <Field label="Amount">
          <Input
            name="amount"
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              autoAllocate(Number(e.target.value) || 0);
            }}
          />
        </Field>
        <Field label="Mode">
          <Select name="mode" defaultValue="UPI">
            <option>CASH</option>
            <option>UPI</option>
            <option>NEFT</option>
            <option>CHEQUE</option>
            <option>OTHER</option>
          </Select>
        </Field>
        <Field label="Reference">
          <Input name="reference" placeholder="UTR / cheque no" />
        </Field>
        <Field label="Notes">
          <Input name="notes" />
        </Field>
      </div>
      <div className="rounded-lg border border-line">
        <div className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Allocate to {direction === "IN" ? "invoices" : "bills"}
        </div>
        {docs.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted">No open documents for this party.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="px-3 py-2">Doc</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">This payment</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const due = d.total - d.paid;
                return (
                  <tr key={d.id} className="border-t border-line">
                    <td className="px-3 py-2">
                      {d.number}
                      <div className="text-xs text-muted">{d.label}</div>
                    </td>
                    <td className="px-3 py-2">{money(due)}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={due}
                        value={alloc[d.id] ?? ""}
                        onChange={(e) => setAlloc((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <SubmitButton>Save payment</SubmitButton>
    </ActionForm>
  );
}
