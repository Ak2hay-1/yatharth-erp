import type { ProductLane, VegMark } from "@prisma/client";

/** Default food-label veg mark from product lane / name when none is set yet. */
export function vegMarkFromLane(
  lane: ProductLane | string | null | undefined,
  hint?: { sku?: string; name?: string },
): VegMark {
  if (lane === "CHICKEN") return "NON_VEG";
  if (lane === "POTATO" || lane === "GRAVY" || lane === "SNACKS" || lane === "CUSTOM") return "VEG";
  const text = `${hint?.sku ?? ""} ${hint?.name ?? ""}`.toLowerCase();
  if (/chk|chicken|non[\s-]?veg|meat|poultry/.test(text)) return "NON_VEG";
  if (/veg|aloo|potato|corn|paneer|pav\s*bhaji|methi/.test(text)) return "VEG";
  return "NA";
}

export function resolveVegMark(
  explicit: VegMark | string | null | undefined,
  lane: ProductLane | string | null | undefined,
  hint?: { sku?: string; name?: string },
): VegMark {
  if (explicit === "VEG" || explicit === "NON_VEG") return explicit;
  return vegMarkFromLane(lane, hint);
}

export function hasFoodVegMark(mark: VegMark | string | null | undefined) {
  return mark === "VEG" || mark === "NON_VEG";
}
