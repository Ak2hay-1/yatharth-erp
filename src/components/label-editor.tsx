"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea, Button } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";

type Line = { name: string; qtyPct: string };

type LabelDefaults = {
  ingredientStatement: string;
  allergens: string;
  containsMayContain: string;
  claims: string;
  netQuantity: string;
  vegNonVeg: string;
  servingSize: string;
  servingsPerPack: string;
  energyKcal100: number;
  energyKj100: number;
  protein100: number;
  carb100: number;
  sugars100: number;
  fat100: number;
  satFat100: number;
  transFat100: number;
  fibre100: number;
  sodium100: number;
  energyKcalServe: number;
  energyKjServe: number;
  proteinServe: number;
  carbServe: number;
  sugarsServe: number;
  fatServe: number;
  satFatServe: number;
  transFatServe: number;
  fibreServe: number;
  sodiumServe: number;
  ingredientLines: { name: string; qtyPct: number | null }[];
};

export function LabelEditor({
  action,
  defaults,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults: LabelDefaults;
}) {
  const [lines, setLines] = useState<Line[]>(
    defaults.ingredientLines.length
      ? defaults.ingredientLines.map((l) => ({ name: l.name, qtyPct: l.qtyPct != null ? String(l.qtyPct) : "" }))
      : [{ name: "", qtyPct: "" }],
  );

  return (
    <ActionForm action={action} className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-display text-lg">Ingredients (labelling)</h2>
        <p className="text-sm text-muted">List in descending quantity order. Statement auto-fills if left blank.</p>
        {lines.map((line, idx) => (
          <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
            <Input
              name="ingName"
              placeholder="Ingredient name"
              value={line.name}
              onChange={(e) => {
                const next = [...lines];
                next[idx] = { ...next[idx], name: e.target.value };
                setLines(next);
              }}
            />
            <Input
              name="ingPct"
              type="number"
              step="0.1"
              placeholder="% (opt)"
              value={line.qtyPct}
              onChange={(e) => {
                const next = [...lines];
                next[idx] = { ...next[idx], qtyPct: e.target.value };
                setLines(next);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLines(lines.filter((_, i) => i !== idx))}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={() => setLines([...lines, { name: "", qtyPct: "" }])}>
          Add ingredient
        </Button>
        <Field label="Ingredient statement (pack copy)">
          <Textarea name="ingredientStatement" defaultValue={defaults.ingredientStatement} rows={3} />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Allergens">
            <Input name="allergens" defaultValue={defaults.allergens} placeholder="Contains: wheat, milk…" />
          </Field>
          <Field label="May contain">
            <Input name="containsMayContain" defaultValue={defaults.containsMayContain} />
          </Field>
          <Field label="Net quantity">
            <Input name="netQuantity" defaultValue={defaults.netQuantity} placeholder="500 g" />
          </Field>
          <Field label="Veg / Non-veg">
            <Select name="vegNonVeg" defaultValue={defaults.vegNonVeg}>
              <option value="NA">—</option>
              <option value="VEG">Vegetarian</option>
              <option value="NON_VEG">Non-vegetarian</option>
            </Select>
          </Field>
          <Field label="Claims" className="md:col-span-2">
            <Input name="claims" defaultValue={defaults.claims} placeholder="No added preservatives…" />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg">Nutrition information</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Serving size">
            <Input name="servingSize" defaultValue={defaults.servingSize} placeholder="80 g" />
          </Field>
          <Field label="Servings per pack">
            <Input name="servingsPerPack" defaultValue={defaults.servingsPerPack} />
          </Field>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Per 100 g</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["energyKcal100", "Energy (kcal)", defaults.energyKcal100],
              ["energyKj100", "Energy (kJ)", defaults.energyKj100],
              ["protein100", "Protein (g)", defaults.protein100],
              ["carb100", "Carbohydrate (g)", defaults.carb100],
              ["sugars100", "Sugars (g)", defaults.sugars100],
              ["fat100", "Fat (g)", defaults.fat100],
              ["satFat100", "Saturated fat (g)", defaults.satFat100],
              ["transFat100", "Trans fat (g)", defaults.transFat100],
              ["fibre100", "Fibre (g)", defaults.fibre100],
              ["sodium100", "Sodium (mg)", defaults.sodium100],
            ] as const
          ).map(([name, label, val]) => (
            <Field key={name} label={label}>
              <Input name={name} type="number" step="0.01" defaultValue={val} />
            </Field>
          ))}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Per serve</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["energyKcalServe", "Energy (kcal)", defaults.energyKcalServe],
              ["energyKjServe", "Energy (kJ)", defaults.energyKjServe],
              ["proteinServe", "Protein (g)", defaults.proteinServe],
              ["carbServe", "Carbohydrate (g)", defaults.carbServe],
              ["sugarsServe", "Sugars (g)", defaults.sugarsServe],
              ["fatServe", "Fat (g)", defaults.fatServe],
              ["satFatServe", "Saturated fat (g)", defaults.satFatServe],
              ["transFatServe", "Trans fat (g)", defaults.transFatServe],
              ["fibreServe", "Fibre (g)", defaults.fibreServe],
              ["sodiumServe", "Sodium (mg)", defaults.sodiumServe],
            ] as const
          ).map(([name, label, val]) => (
            <Field key={name} label={label}>
              <Input name={name} type="number" step="0.01" defaultValue={val} />
            </Field>
          ))}
        </div>
      </section>

      <SubmitButton>Save label</SubmitButton>
    </ActionForm>
  );
}
