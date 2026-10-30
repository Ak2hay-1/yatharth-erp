import { assetUrl, type PublicProduct } from "@/lib/api";

export function isVegProduct(category: string) {
  return category === "veg" || category === "potato-veg";
}

export function packLabel(product: Pick<PublicProduct, "packSize" | "unitsPerPkt">) {
  return product.packSize || `${product.unitsPerPkt} pcs / packet`;
}

export function productImageSrc(product: Pick<PublicProduct, "name" | "category" | "assets">) {
  const img = product.assets?.[0]?.publicUrl;
  if (img) return assetUrl(img);
  if (/nugget/i.test(product.name)) return "/marketing/category-nuggets.jpg";
  if (!isVegProduct(product.category)) return "/marketing/category-nonveg-patties.jpg";
  return "/marketing/category-veg-patties.jpg";
}

export function productSummary(product: Pick<PublicProduct, "name" | "category">) {
  const kind = /nugget/i.test(product.name)
    ? "nuggets"
    : isVegProduct(product.category)
      ? "vegetarian patties"
      : "chicken patties";
  return `Frozen ${kind} for restaurants, cafes, hotels and distributors. Packed for consistent taste and cold-chain supply from our Pune plant.`;
}

export const FROZEN_HANDLING = [
  "Keep frozen at −18°C or below until you are ready to cook.",
  "Cook from frozen by deep fry, shallow fry, grill, or air fry until the centre is hot.",
  "Do not refreeze after thawing.",
];
