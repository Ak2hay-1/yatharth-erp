"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { VegMark } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { parseNum, requiredString } from "@/lib/utils";
import { enqueueWebsiteSync } from "@/lib/website-sync";

function nutritionFields(formData: FormData) {
  return {
    ingredientStatement: String(formData.get("ingredientStatement") ?? "").trim(),
    allergens: String(formData.get("allergens") ?? "").trim(),
    containsMayContain: String(formData.get("containsMayContain") ?? "").trim(),
    claims: String(formData.get("claims") ?? "").trim(),
    netQuantity: String(formData.get("netQuantity") ?? "").trim(),
    vegNonVeg: (String(formData.get("vegNonVeg") || "NA") as VegMark) || "NA",
    servingSize: String(formData.get("servingSize") ?? "").trim(),
    servingsPerPack: String(formData.get("servingsPerPack") ?? "").trim(),
    energyKcal100: parseNum(formData.get("energyKcal100")),
    energyKj100: parseNum(formData.get("energyKj100")),
    protein100: parseNum(formData.get("protein100")),
    carb100: parseNum(formData.get("carb100")),
    sugars100: parseNum(formData.get("sugars100")),
    fat100: parseNum(formData.get("fat100")),
    satFat100: parseNum(formData.get("satFat100")),
    transFat100: parseNum(formData.get("transFat100")),
    fibre100: parseNum(formData.get("fibre100")),
    sodium100: parseNum(formData.get("sodium100")),
    energyKcalServe: parseNum(formData.get("energyKcalServe")),
    energyKjServe: parseNum(formData.get("energyKjServe")),
    proteinServe: parseNum(formData.get("proteinServe")),
    carbServe: parseNum(formData.get("carbServe")),
    sugarsServe: parseNum(formData.get("sugarsServe")),
    fatServe: parseNum(formData.get("fatServe")),
    satFatServe: parseNum(formData.get("satFatServe")),
    transFatServe: parseNum(formData.get("transFatServe")),
    fibreServe: parseNum(formData.get("fibreServe")),
    sodiumServe: parseNum(formData.get("sodiumServe")),
  };
}

function parseIngredientLines(formData: FormData) {
  const names = formData.getAll("ingName").map(String);
  const pcts = formData.getAll("ingPct").map(String);
  const lines: { name: string; sortOrder: number; qtyPct: number | null }[] = [];
  names.forEach((name, i) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const pctRaw = pcts[i]?.trim();
    lines.push({
      name: trimmed,
      sortOrder: i,
      qtyPct: pctRaw ? Number(pctRaw) : null,
    });
  });
  return lines;
}

function composeStatement(lines: { name: string; qtyPct: number | null }[]) {
  if (lines.length === 0) return "";
  return lines
    .map((l) => (l.qtyPct != null && Number.isFinite(l.qtyPct) ? `${l.name} (${l.qtyPct}%)` : l.name))
    .join(", ");
}

export async function saveItemLabel(itemId: string, formData: FormData) {
  await requireRole(MANAGEMENT);
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || item.type !== "FINISHED") throw new Error("Finished item required.");

  const lines = parseIngredientLines(formData);
  const data = nutritionFields(formData);
  if (!data.ingredientStatement && lines.length) {
    data.ingredientStatement = composeStatement(lines);
  }

  await prisma.$transaction(async (tx) => {
    const label = await tx.itemLabel.upsert({
      where: { itemId },
      create: { itemId, ...data },
      update: data,
    });
    await tx.labelIngredientLine.deleteMany({ where: { labelId: label.id } });
    if (lines.length) {
      await tx.labelIngredientLine.createMany({
        data: lines.map((l) => ({
          labelId: label.id,
          name: l.name,
          sortOrder: l.sortOrder,
          qtyPct: l.qtyPct,
        })),
      });
    }
  });

  void enqueueWebsiteSync("products");
  revalidatePath("/masters/labelling");
  revalidatePath(`/masters/labelling/${itemId}`);
  revalidatePath(`/print/label/${itemId}`);
  redirect(`/masters/labelling/${itemId}?saved=1`);
}

export async function ensureItemLabel(itemId: string) {
  await requireRole(MANAGEMENT);
  requiredString(itemId, "Item");
  await prisma.itemLabel.upsert({
    where: { itemId },
    create: { itemId },
    update: {},
  });
  revalidatePath("/masters/labelling");
  redirect(`/masters/labelling/${itemId}`);
}
