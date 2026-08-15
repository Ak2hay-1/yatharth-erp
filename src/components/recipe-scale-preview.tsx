"use client";

import { useMemo, useState } from "react";
import { Card, Field, Input, Table, Td, Th } from "@/components/ui";
import { recipeScaleFactor } from "@/lib/recipe-scale";
import { qty } from "@/lib/utils";

export type ScaleLine = {
  name: string;
  unit: string;
  qty: number;
};

export function RecipeScalePreview({
  outputQty,
  outputUnit,
  lines,
}: {
  outputQty: number;
  outputUnit: string;
  lines: ScaleLine[];
}) {
  const [desiredRaw, setDesiredRaw] = useState(String(outputQty));
  const desiredQty = Number(desiredRaw);
  const validDesired = Number.isFinite(desiredQty) && desiredQty > 0;
  const canScale = outputQty > 0 && validDesired;
  const scale = canScale ? recipeScaleFactor(desiredQty, outputQty) : 0;

  const scaled = useMemo(
    () => (canScale ? lines.map((l) => ({ ...l, scaledQty: l.qty * scale })) : []),
    [canScale, lines, scale],
  );

  return (
    <Card className="p-5">
      <h2 className="font-display mb-1 text-xl">Scale recipe</h2>
      <p className="mb-4 text-sm text-muted">
        Preview only — does not change the saved standard batch (
        {qty(outputQty, outputUnit)}).
      </p>
      <Field label={`Produce how much? (${outputUnit})`} className="mb-4">
        <Input
          type="number"
          step="0.001"
          min="0"
          value={desiredRaw}
          onChange={(e) => setDesiredRaw(e.target.value)}
          placeholder={String(outputQty)}
        />
      </Field>
      {!canScale ? (
        <p className="text-sm text-muted">
          {outputQty <= 0
            ? "Standard output quantity must be greater than zero to scale."
            : "Enter a production quantity greater than zero."}
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            Scale factor{" "}
            <span className="font-semibold text-ink">
              {scale.toLocaleString("en-IN", { maximumFractionDigits: 4 })}×
            </span>
          </p>
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th>Per standard batch</Th>
                <Th>For this run</Th>
              </tr>
            </thead>
            <tbody>
              {scaled.length === 0 ? (
                <tr>
                  <Td className="text-muted">No ingredients on this recipe.</Td>
                  <Td />
                  <Td />
                </tr>
              ) : (
                scaled.map((l, i) => (
                  <tr key={`${l.name}-${i}`}>
                    <Td>{l.name}</Td>
                    <Td>{qty(l.qty, l.unit)}</Td>
                    <Td className="font-semibold">{qty(l.scaledQty, l.unit)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </>
      )}
    </Card>
  );
}
