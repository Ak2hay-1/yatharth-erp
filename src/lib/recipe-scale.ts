export function recipeScaleFactor(desiredQty: number, outputQty: number): number {
  if (!(outputQty > 0) || !Number.isFinite(desiredQty) || desiredQty < 0) return 0;
  return desiredQty / outputQty;
}

export function scaleRecipeLines<T extends { itemId: string; qty: number }>(
  lines: T[],
  desiredQty: number,
  outputQty: number,
): { itemId: string; qty: number }[] {
  const scale = recipeScaleFactor(desiredQty, outputQty);
  return lines.map((l) => ({ itemId: l.itemId, qty: l.qty * scale }));
}
