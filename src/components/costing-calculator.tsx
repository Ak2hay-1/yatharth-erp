"use client";

import { useMemo, useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { suggestedRate } from "@/lib/rate-math";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  defaults: {
    mfgCost: number;
    mfgCostSource: string;
    usp: number;
    rateB2b: number;
    rateWholesale: number;
    rateDistributor: number;
    rateMrp: number;
    overrideB2bPct: number | null;
    overrideWholesalePct: number | null;
    overrideDistributorPct: number | null;
    overrideMrpPct: number | null;
  };
  company: {
    markupB2bPct: number;
    markupWholesalePct: number;
    markupDistributorPct: number;
    markupMrpPct: number;
  };
};

export function CostingCalculator({ action, defaults, company }: Props) {
  const [mfgCost, setMfgCost] = useState(defaults.mfgCost);
  const [b2bPct, setB2bPct] = useState(defaults.overrideB2bPct ?? company.markupB2bPct);
  const [whPct, setWhPct] = useState(defaults.overrideWholesalePct ?? company.markupWholesalePct);
  const [distPct, setDistPct] = useState(defaults.overrideDistributorPct ?? company.markupDistributorPct);
  const [mrpPct, setMrpPct] = useState(defaults.overrideMrpPct ?? company.markupMrpPct);
  const [applySuggested, setApplySuggested] = useState(true);

  const suggested = useMemo(
    () => ({
      b2b: suggestedRate(mfgCost, b2bPct),
      wholesale: suggestedRate(mfgCost, whPct),
      distributor: suggestedRate(mfgCost, distPct),
      mrp: suggestedRate(mfgCost, mrpPct),
    }),
    [mfgCost, b2bPct, whPct, distPct, mrpPct],
  );

  return (
    <ActionForm action={action} className="grid gap-4 md:grid-cols-2">
      <Field label="Manufacturing cost (per unit)">
        <Input
          name="mfgCost"
          type="number"
          step="0.01"
          value={mfgCost}
          onChange={(e) => setMfgCost(Number(e.target.value) || 0)}
        />
      </Field>
      <Field label="Cost source">
        <Select name="mfgCostSource" defaultValue={defaults.mfgCostSource || "MANUAL"}>
          <option value="MANUAL">Manual</option>
          <option value="RECIPE">Recipe BOM</option>
          <option value="LAST_BATCH">Last production batch</option>
          <option value="NONE">—</option>
        </Select>
      </Field>

      <div className="md:col-span-2 rounded-lg border border-line bg-bg p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Markup % (blank override = company default)
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={`B2B % (co. ${company.markupB2bPct})`}>
            <Input
              name="overrideB2bPct"
              type="number"
              step="0.1"
              value={b2bPct}
              onChange={(e) => setB2bPct(Number(e.target.value) || 0)}
            />
          </Field>
          <Field label={`Wholesale % (co. ${company.markupWholesalePct})`}>
            <Input
              name="overrideWholesalePct"
              type="number"
              step="0.1"
              value={whPct}
              onChange={(e) => setWhPct(Number(e.target.value) || 0)}
            />
          </Field>
          <Field label={`Distributor % (co. ${company.markupDistributorPct})`}>
            <Input
              name="overrideDistributorPct"
              type="number"
              step="0.1"
              value={distPct}
              onChange={(e) => setDistPct(Number(e.target.value) || 0)}
            />
          </Field>
          <Field label={`MRP % (co. ${company.markupMrpPct})`}>
            <Input
              name="overrideMrpPct"
              type="number"
              step="0.1"
              value={mrpPct}
              onChange={(e) => setMrpPct(Number(e.target.value) || 0)}
            />
          </Field>
        </div>
        <p className="mt-3 text-sm text-muted">
          Suggested: B2B {suggested.b2b.toFixed(2)} · Wholesale {suggested.wholesale.toFixed(2)} · Dist{" "}
          {suggested.distributor.toFixed(2)} · MRP {suggested.mrp.toFixed(2)}
        </p>
      </div>

      <label className="md:col-span-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="applySuggested"
          checked={applySuggested}
          onChange={(e) => setApplySuggested(e.target.checked)}
          className="accent-[var(--saffron,#fe7733)]"
        />
        Apply suggested rates from manufacturing cost × markup (overwrites rate fields below)
      </label>

      <Field label="Unit Selling Price (USP)">
        <Input name="usp" type="number" step="0.01" defaultValue={applySuggested ? suggested.b2b : defaults.usp} key={`usp-${applySuggested}-${suggested.b2b}`} />
      </Field>
      <Field label="B2B rate">
        <Input name="rateB2b" type="number" step="0.01" defaultValue={applySuggested ? suggested.b2b : defaults.rateB2b} key={`b2b-${applySuggested}-${suggested.b2b}`} />
      </Field>
      <Field label="Wholesale rate">
        <Input name="rateWholesale" type="number" step="0.01" defaultValue={applySuggested ? suggested.wholesale : defaults.rateWholesale} key={`wh-${applySuggested}-${suggested.wholesale}`} />
      </Field>
      <Field label="Distributor rate">
        <Input name="rateDistributor" type="number" step="0.01" defaultValue={applySuggested ? suggested.distributor : defaults.rateDistributor} key={`dist-${applySuggested}-${suggested.distributor}`} />
      </Field>
      <Field label="MRP">
        <Input name="rateMrp" type="number" step="0.01" defaultValue={applySuggested ? suggested.mrp : defaults.rateMrp} key={`mrp-${applySuggested}-${suggested.mrp}`} />
      </Field>

      <div className="md:col-span-2">
        <SubmitButton>Save costing</SubmitButton>
      </div>
    </ActionForm>
  );
}
