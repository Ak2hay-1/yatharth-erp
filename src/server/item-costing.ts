"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MfgCostSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { parseNum, requiredString } from "@/lib/utils";
import { itemUnitCost, recipeUnitCost, ratesFromMfg, resolveMarkups, getCompanyMarkups } from "@/server/costing";
import { removeDocumentFile, saveDocumentFile } from "@/lib/document-storage";
import { enqueueProductSync } from "@/lib/sync/queue";

function parseOptionalPct(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function saveItemCosting(itemId: string, formData: FormData) {
  await requireRole(MANAGEMENT);
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || item.type !== "FINISHED") throw new Error("Finished item required.");

  const mfgCost = parseNum(formData.get("mfgCost"));
  const applySuggested = formData.get("applySuggested") === "on";

  const company = await getCompanyMarkups();
  const overrides = {
    overrideB2bPct: parseOptionalPct(formData.get("overrideB2bPct")),
    overrideWholesalePct: parseOptionalPct(formData.get("overrideWholesalePct")),
    overrideDistributorPct: parseOptionalPct(formData.get("overrideDistributorPct")),
    overrideMrpPct: parseOptionalPct(formData.get("overrideMrpPct")),
  };
  const markups = resolveMarkups(company, overrides);
  const suggested = ratesFromMfg(mfgCost, markups);

  await prisma.item.update({
    where: { id: itemId },
    data: {
      mfgCost,
      mfgCostSource: (String(formData.get("mfgCostSource") || "MANUAL") as MfgCostSource) || "MANUAL",
      mfgCostUpdatedAt: new Date(),
      ...overrides,
      usp: applySuggested ? suggested.usp : parseNum(formData.get("usp")),
      rateB2b: applySuggested ? suggested.rateB2b : parseNum(formData.get("rateB2b")),
      unitsPerPkt: Math.max(1, Math.round(parseNum(formData.get("unitsPerPkt"), item.unitsPerPkt || 1))),
      rateWholesale: applySuggested ? suggested.rateWholesale : parseNum(formData.get("rateWholesale")),
      rateDistributor: applySuggested ? suggested.rateDistributor : parseNum(formData.get("rateDistributor")),
      rateMrp: applySuggested ? suggested.rateMrp : parseNum(formData.get("rateMrp")),
      // keep sellingPrice aligned with USP for sales defaults
      sellingPrice: applySuggested ? suggested.usp : parseNum(formData.get("usp")),
    },
  });

  enqueueProductSync(item.sku);
  revalidatePath("/masters/costing");
  revalidatePath(`/masters/costing/${itemId}`);
  revalidatePath(`/masters/items/${itemId}`);
  redirect(`/masters/costing/${itemId}?saved=1`);
}

export async function refreshMfgCost(itemId: string, formData: FormData) {
  await requireRole(MANAGEMENT);
  const source = requiredString(formData.get("source"), "Source") as MfgCostSource;
  let mfgCost = 0;

  if (source === "RECIPE") {
    const recipe = await prisma.recipe.findUnique({ where: { finishedItemId: itemId } });
    if (!recipe) throw new Error("No recipe for this SKU.");
    mfgCost = await recipeUnitCost(prisma, recipe.id);
  } else if (source === "LAST_BATCH") {
    mfgCost = await itemUnitCost(prisma, itemId);
  } else {
    throw new Error("Choose recipe or last batch.");
  }

  const company = await getCompanyMarkups();
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Item not found");
  const markups = resolveMarkups(company, item);
  const rates = ratesFromMfg(mfgCost, markups);

  await prisma.item.update({
    where: { id: itemId },
    data: {
      mfgCost,
      mfgCostSource: source,
      mfgCostUpdatedAt: new Date(),
      usp: rates.usp,
      rateB2b: rates.rateB2b,
      rateWholesale: rates.rateWholesale,
      rateDistributor: rates.rateDistributor,
      rateMrp: rates.rateMrp,
      sellingPrice: rates.usp,
    },
  });

  enqueueProductSync(item.sku);
  revalidatePath(`/masters/costing/${itemId}`);
  revalidatePath("/masters/costing");
  redirect(`/masters/costing/${itemId}?saved=1`);
}

export async function uploadCostAttachment(itemId: string, formData: FormData) {
  await requireRole(MANAGEMENT);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) throw new Error("Choose a file.");
  const saved = await saveDocumentFile(file);
  try {
    await prisma.itemCostAttachment.create({
      data: {
        itemId,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        storageKey: saved.storageKey,
        notes: String(formData.get("notes") ?? "").trim(),
      },
    });
  } catch (err) {
    await removeDocumentFile(saved.storageKey);
    throw err;
  }
  revalidatePath(`/masters/costing/${itemId}`);
  redirect(`/masters/costing/${itemId}`);
}

export async function deleteCostAttachment(id: string) {
  await requireRole(MANAGEMENT);
  const row = await prisma.itemCostAttachment.findUnique({ where: { id } });
  if (!row) throw new Error("Attachment not found");
  await prisma.itemCostAttachment.delete({ where: { id } });
  await removeDocumentFile(row.storageKey);
  revalidatePath(`/masters/costing/${row.itemId}`);
}
