"use server";

import { revalidatePath } from "next/cache";
import type { PackType, ProductLane, SkuTier, VegMark } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MANAGEMENT } from "@/lib/permissions";
import { requireRole } from "@/lib/session";
import { parseNum, requiredString } from "@/lib/utils";
import { runAction } from "@/lib/run-action";
import { enqueueWebsiteSync } from "@/lib/website-sync";

const VEG_MARKS = new Set<VegMark>(["NA", "VEG", "NON_VEG"]);

function vegMarkOf(value: FormDataEntryValue | null): VegMark {
  const mark = String(value || "NA") as VegMark;
  return VEG_MARKS.has(mark) ? mark : "NA";
}

function catalogItemData(formData: FormData) {
  const usp = parseNum(formData.get("usp"));
  const rateB2b = parseNum(formData.get("rateB2b"));
  const sellingPrice = usp > 0 ? usp : parseNum(formData.get("sellingPrice"));
  return {
    sku: requiredString(formData.get("sku"), "SKU"),
    name: requiredString(formData.get("name"), "Name"),
    type: "FINISHED" as const,
    unit: requiredString(formData.get("unit") || "pcs", "Unit"),
    hsn: String(formData.get("hsn") ?? "").trim(),
    gstRate: parseNum(formData.get("gstRate"), 5),
    shelfLifeDays: Math.round(parseNum(formData.get("shelfLifeDays"), 30)),
    lane: (String(formData.get("lane") || "NONE") as ProductLane),
    tier: (String(formData.get("tier") || "NONE") as SkuTier),
    packType: (String(formData.get("packType") || "NONE") as PackType),
    packSize: String(formData.get("packSize") ?? "").trim(),
    usp,
    rateB2b,
    sellingPrice,
    isActive: formData.get("activeFlag") === "1" ? formData.get("isActive") === "true" : true,
    vegNonVeg: vegMarkOf(formData.get("vegNonVeg")),
    servingsPerPack: String(formData.get("servingsPerPack") ?? "").trim(),
  };
}

async function upsertCatalogLabel(
  itemId: string,
  vegNonVeg: VegMark,
  servingsPerPack: string,
) {
  await prisma.itemLabel.upsert({
    where: { itemId },
    create: { itemId, vegNonVeg, servingsPerPack },
    update: { vegNonVeg, servingsPerPack },
  });
}

function revalidateCatalog(itemId?: string) {
  revalidatePath("/masters/website-catalog");
  revalidatePath("/masters/items");
  revalidatePath("/masters/media");
  revalidatePath("/masters/labelling");
  revalidatePath("/masters/costing");
  if (itemId) {
    revalidatePath(`/masters/website-catalog/${itemId}`);
    revalidatePath(`/masters/items/${itemId}`);
    revalidatePath(`/masters/labelling/${itemId}`);
    revalidatePath(`/masters/costing/${itemId}`);
  }
}

export async function createWebsiteCatalogProduct(formData: FormData) {
  return runAction(async () => {
    await requireRole(MANAGEMENT);
    const data = catalogItemData(formData);
    const { vegNonVeg, servingsPerPack, ...itemFields } = data;

    const item = await prisma.item.create({ data: itemFields });
    await upsertCatalogLabel(item.id, vegNonVeg, servingsPerPack);
    void enqueueWebsiteSync("products");
    revalidateCatalog(item.id);

    return {
      id: item.id,
      sku: item.sku,
      redirectTo: `/masters/website-catalog/${item.id}?saved=1`,
    };
  });
}

export async function updateWebsiteCatalogProduct(id: string, formData: FormData) {
  return runAction(async () => {
    await requireRole(MANAGEMENT);
    const existing = await prisma.item.findUnique({ where: { id }, select: { id: true, type: true } });
    if (!existing || existing.type !== "FINISHED") {
      throw new Error("Finished catalog product required.");
    }

    const data = catalogItemData(formData);
    const { vegNonVeg, servingsPerPack, ...itemFields } = data;

    const item = await prisma.item.update({ where: { id }, data: itemFields });
    await upsertCatalogLabel(item.id, vegNonVeg, servingsPerPack);
    void enqueueWebsiteSync("products");
    void enqueueWebsiteSync("asset", item.sku);
    revalidateCatalog(item.id);

    return {
      id: item.id,
      sku: item.sku,
      redirectTo: `/masters/website-catalog/${item.id}?saved=1`,
    };
  });
}
