import { round3 } from "@/lib/utils";

export type UnitFamily = "weight" | "volume";

const WEIGHT_UNITS = new Set(["g", "kg"]);

/** Normalize unit strings (e.g. mL → ml, litre → L). */
export function normalizeUnit(unit: string): string {
  const u = unit.trim();
  if (!u) return u;
  const lower = u.toLowerCase();
  if (lower === "g" || lower === "gram" || lower === "grams") return "g";
  if (lower === "kg" || lower === "kilogram" || lower === "kilograms") return "kg";
  if (lower === "ml" || lower === "millilitre" || lower === "millilitres" || lower === "milliliter" || lower === "milliliters")
    return "ml";
  if (lower === "l" || lower === "litre" || lower === "litres" || lower === "liter" || lower === "liters") return "L";
  return u;
}

export function unitFamily(unit: string): UnitFamily | null {
  const n = normalizeUnit(unit);
  if (WEIGHT_UNITS.has(n)) return "weight";
  if (n === "ml" || n === "L") return "volume";
  return null;
}

export function entryUnitsFor(itemUnit: string): string[] {
  const family = unitFamily(itemUnit);
  if (family === "weight") return ["g", "kg"];
  if (family === "volume") return ["ml", "L"];
  return [];
}

function toCanonical(unit: string): "g" | "kg" | "ml" | "L" | null {
  const n = normalizeUnit(unit);
  if (n === "g" || n === "kg" || n === "ml" || n === "L") return n;
  return null;
}

/** Convert qty from one unit to another within the same family. */
function convertWithinFamily(qty: number, fromUnit: string, toUnit: string): number {
  const from = toCanonical(fromUnit);
  const to = toCanonical(toUnit);
  if (!from || !to || unitFamily(fromUnit) !== unitFamily(toUnit)) return qty;

  if (from === to) return qty;
  if (from === "g" && to === "kg") return qty * 0.001;
  if (from === "kg" && to === "g") return qty * 1000;
  if (from === "ml" && to === "L") return qty * 0.001;
  if (from === "L" && to === "ml") return qty * 1000;
  return qty;
}

export function toBaseUnit(qty: number, fromUnit: string, baseUnit: string): number {
  const base = normalizeUnit(baseUnit);
  const from = normalizeUnit(fromUnit);
  if (!unitFamily(base) || unitFamily(base) !== unitFamily(from)) return qty;
  return round3(convertWithinFamily(qty, from, base));
}

export function fromBaseUnit(qty: number, baseUnit: string, displayUnit: string): number {
  const base = normalizeUnit(baseUnit);
  const display = normalizeUnit(displayUnit);
  if (!unitFamily(base) || unitFamily(base) !== unitFamily(display)) return qty;
  return round3(convertWithinFamily(qty, base, display));
}

export function pickDisplayUnit(qty: number, baseUnit: string): string {
  const base = normalizeUnit(baseUnit);
  const family = unitFamily(base);
  if (family === "weight" && base === "kg" && qty > 0 && qty < 1) return "g";
  if (family === "volume" && base === "L" && qty > 0 && qty < 1) return "ml";
  return base;
}

export function formatQtySmart(qty: number, baseUnit: string): { qty: number; unit: string } {
  const base = normalizeUnit(baseUnit);
  const displayUnit = pickDisplayUnit(qty, base);
  const displayQty = fromBaseUnit(qty, base, displayUnit);
  return { qty: displayQty, unit: displayUnit };
}

export function formatQtySmartString(qty: number, baseUnit: string): string {
  const { qty: n, unit } = formatQtySmart(qty, baseUnit);
  const v = Number.isInteger(n) ? String(n) : n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
  return `${v} ${unit}`;
}
