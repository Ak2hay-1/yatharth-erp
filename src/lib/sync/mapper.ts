import type { Item, ItemLabel, ProductAsset } from "@prisma/client";
import type { SyncCompanyPayload, SyncProductPayload } from "@/lib/sync/types";

const VEG_LANES = new Set(["POTATO_VEG", "PANEER_CHEESE"]);

export function categoryFromItem(item: Item, label?: ItemLabel | null): "veg" | "non-veg" {
  if (label?.vegNonVeg === "VEG") return "veg";
  if (label?.vegNonVeg === "NON_VEG") return "non-veg";
  if (item.lane === "CHICKEN") return "non-veg";
  if (VEG_LANES.has(item.lane)) return "veg";
  return "veg";
}

export function mapItemToSyncProduct(
  item: Item,
  label: ItemLabel | null | undefined,
  sortOrder: number,
): SyncProductPayload {
  const unitsPerPkt = item.unitsPerPkt > 0 ? item.unitsPerPkt : 1;
  const usp = item.usp > 0 ? item.usp : item.sellingPrice;
  const rateB2b = item.rateB2b > 0 ? item.rateB2b : usp * unitsPerPkt;

  return {
    sku: item.sku,
    name: item.name,
    category: categoryFromItem(item, label),
    lane: item.lane,
    tier: item.tier,
    packSize: item.packSize,
    unitsPerPkt,
    usp,
    rateB2b,
    isActive: item.isActive,
    sortOrder,
    erpUpdatedAt: item.createdAt.toISOString(),
  };
}

export function mapCompanyToSync(company: {
  name: string;
  legalName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  fssai: string;
}): SyncCompanyPayload {
  return {
    name: company.name,
    legalName: company.legalName,
    address: company.address,
    city: company.city,
    state: company.state,
    pincode: company.pincode,
    phone: company.phone,
    email: company.email,
    gstin: company.gstin,
    fssai: company.fssai,
  };
}

export function pickPrimaryAsset(assets: ProductAsset[]): ProductAsset | null {
  const pack = assets.find((a) => a.kind === "PACK_SHOT");
  return pack ?? assets[0] ?? null;
}
