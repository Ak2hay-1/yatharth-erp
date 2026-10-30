import { assetUrl, type PublicProduct } from "@/lib/api";

export function isVegProduct(category: string) {
  return category === "veg" || category === "potato-veg";
}

export function packLabel(product: Pick<PublicProduct, "packSize" | "unitsPerPkt">) {
  return product.packSize || `${product.unitsPerPkt} pcs / packet`;
}

const PRODUCT_LINE_PHOTOS: Array<{ match: (sku: string, name: string) => boolean; src: string }> = [
  { match: (sku, name) => sku.startsWith("FG-CRISPY-CHK") || /crispy chicken/i.test(name), src: "/products/crispy-chicken-patty.jpg" },
  { match: (sku, name) => sku.startsWith("FG-CHK-CHEESE-NUG") || /chicken cheese nugget/i.test(name), src: "/products/chicken-cheese-nuggets.jpg" },
  { match: (sku, name) => sku.startsWith("FG-CHK-NUG") || /^chicken nugget/i.test(name), src: "/products/chicken-nuggets.jpg" },
  { match: (sku, name) => sku.startsWith("FG-CHK-BALL") || /cheese ball/i.test(name), src: "/products/chicken-cheese-balls.jpg" },
  { match: (sku, name) => sku.startsWith("FG-CHK-PATTY") || /chicken burger patt/i.test(name), src: "/products/chicken-burger-patty.jpg" },
  { match: (sku, name) => sku.startsWith("FG-BTR-CHK") || /butter chicken/i.test(name), src: "/products/butter-chicken.jpg" },
  { match: (sku, name) => sku.startsWith("FG-CRISPY-ALOO") || /crispy aloo/i.test(name), src: "/products/crispy-aloo-patty.jpg" },
  { match: (sku, name) => sku.startsWith("FG-ALOO") || /aloo burger|aloo patt/i.test(name), src: "/products/aloo-burger-patty.jpg" },
  { match: (sku, name) => sku.startsWith("FG-CHEESE-CORN") || /cheese corn/i.test(name), src: "/products/cheese-corn-nuggets.jpg" },
  { match: (sku, name) => sku.startsWith("FG-VEG-PATTY") || /veg burger patt/i.test(name), src: "/products/veg-burger-patty.jpg" },
  { match: (sku, name) => sku.startsWith("FG-PAV") || /pav bhaji/i.test(name), src: "/products/pav-bhaji.jpg" },
];

export function productImageSrc(product: Pick<PublicProduct, "sku" | "name" | "category" | "assets">) {
  const img = product.assets?.[0]?.publicUrl;
  if (img) return assetUrl(img);
  const line = PRODUCT_LINE_PHOTOS.find((entry) => entry.match(product.sku, product.name));
  if (line) return line.src;
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
