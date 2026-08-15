"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ItemType, PackType, ProductLane, SkuTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { parseNum, requiredString } from "@/lib/utils";

function itemData(formData: FormData) {
  return {
    sku: requiredString(formData.get("sku"), "SKU"),
    name: requiredString(formData.get("name"), "Name"),
    type: requiredString(formData.get("type"), "Type") as ItemType,
    unit: requiredString(formData.get("unit"), "Unit"),
    hsn: String(formData.get("hsn") ?? ""),
    gstRate: parseNum(formData.get("gstRate"), 5),
    shelfLifeDays: Math.round(parseNum(formData.get("shelfLifeDays"), 30)),
    reorderLevel: parseNum(formData.get("reorderLevel")),
    sellingPrice: parseNum(formData.get("sellingPrice")),
    purchasePrice: parseNum(formData.get("purchasePrice")),
    lane: (String(formData.get("lane") || "NONE") as ProductLane),
    tier: (String(formData.get("tier") || "NONE") as SkuTier),
    packType: (String(formData.get("packType") || "NONE") as PackType),
    packSize: String(formData.get("packSize") ?? ""),
    gateTaste: formData.get("gateTaste") === "on",
    gateCost: formData.get("gateCost") === "on",
    gateMargin: formData.get("gateMargin") === "on",
    gateProduction: formData.get("gateProduction") === "on",
    gatePackaging: formData.get("gatePackaging") === "on",
    gateShelfLife: formData.get("gateShelfLife") === "on",
    gateAcceptance: formData.get("gateAcceptance") === "on",
    gateRepeat: formData.get("gateRepeat") === "on",
    isActive: formData.get("isActive") !== "false",
  };
}

export async function createItem(formData: FormData) {
  await requireRole(MANAGEMENT);
  const data = itemData(formData);
  await prisma.item.create({ data });
  revalidatePath("/masters/items");
  redirect("/masters/items");
}

/** Create an item and return it (for inline creatable pickers). Does not redirect. */
export async function createItemQuick(formData: FormData) {
  await requireRole(MANAGEMENT);
  const data = itemData(formData);
  const item = await prisma.item.create({ data });
  revalidatePath("/masters/items");
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    unit: item.unit,
    sellingPrice: item.sellingPrice,
    purchasePrice: item.purchasePrice,
    gstRate: item.gstRate,
    type: item.type,
  };
}

export async function updateItem(id: string, formData: FormData) {
  await requireRole(MANAGEMENT);
  await prisma.item.update({ where: { id }, data: itemData(formData) });
  revalidatePath("/masters/items");
  redirect("/masters/items");
}

export async function listItems(type?: ItemType) {
  return prisma.item.findMany({
    where: type ? { type } : undefined,
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}
