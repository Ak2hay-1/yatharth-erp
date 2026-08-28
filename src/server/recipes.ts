"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ContentLocale } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { entryUnitsFor, normalizeUnit, toBaseUnit } from "@/lib/units";
import { parseNum, requiredString } from "@/lib/utils";

type Line = { itemId: string; qty: number };

type RawLine = { itemId: string; qty: number | string; unit?: string; rate?: string };

const LOCALES: ContentLocale[] = ["en_IN", "en_US", "en_GB", "hi", "mr"];

function parseLocale(value: FormDataEntryValue | null): ContentLocale {
  const raw = String(value ?? "en_IN");
  if ((LOCALES as string[]).includes(raw)) return raw as ContentLocale;
  return "en_IN";
}

async function parseLines(formData: FormData): Promise<Line[]> {
  const raw = JSON.parse(String(formData.get("lines") ?? "[]")) as RawLine[];
  const filtered = raw.filter((l) => l.itemId && Number(l.qty) > 0);
  if (!filtered.length) throw new Error("Add at least one ingredient");

  const itemIds = [...new Set(filtered.map((l) => l.itemId))];
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, unit: true, name: true },
  });
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));

  return filtered.map((l) => {
    const item = byId[l.itemId];
    if (!item) throw new Error("Ingredient not found");
    const qty = Number(l.qty);
    const allowed = entryUnitsFor(item.unit);
    if (!allowed.length) return { itemId: l.itemId, qty };
    const fromUnit = l.unit ? normalizeUnit(l.unit) : normalizeUnit(item.unit);
    if (!allowed.includes(fromUnit)) {
      throw new Error(`Invalid unit "${l.unit}" for ${item.name}. Use ${allowed.join(" or ")}.`);
    }
    return { itemId: l.itemId, qty: toBaseUnit(qty, fromUnit, item.unit) };
  });
}

export async function createRecipe(formData: FormData) {
  await requireRole(MANAGEMENT);
  const finishedItemId = requiredString(formData.get("finishedItemId"), "Finished product");
  const existing = await prisma.recipe.findUnique({ where: { finishedItemId } });
  if (existing) throw new Error("A recipe already exists for this product");
  const lines = await parseLines(formData);
  await prisma.recipe.create({
    data: {
      finishedItemId,
      name: requiredString(formData.get("name"), "Name"),
      outputQty: parseNum(formData.get("outputQty")),
      notes: String(formData.get("notes") ?? ""),
      lines: { create: lines },
    },
  });
  revalidatePath("/masters/recipes");
  redirect("/masters/recipes");
}

export async function updateRecipe(id: string, formData: FormData) {
  await requireRole(MANAGEMENT);
  const lines = await parseLines(formData);
  await prisma.$transaction([
    prisma.recipeLine.deleteMany({ where: { recipeId: id } }),
    prisma.recipe.update({
      where: { id },
      data: {
        name: requiredString(formData.get("name"), "Name"),
        outputQty: parseNum(formData.get("outputQty")),
        notes: String(formData.get("notes") ?? ""),
        lines: { create: lines },
      },
    }),
  ]);
  revalidatePath("/masters/recipes");
  redirect("/masters/recipes");
}

export async function saveRecipeTranslation(recipeId: string, formData: FormData) {
  await requireRole(MANAGEMENT);
  const locale = parseLocale(formData.get("locale"));
  const map: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("ing_") && typeof value === "string" && value.trim()) {
      map[key.slice(4)] = value.trim();
    }
  }
  const ingredientNamesJson = JSON.stringify(map);

  if (locale === "en_IN") {
    await prisma.recipe.update({
      where: { id: recipeId },
      data: {
        name: requiredString(formData.get("name"), "Name"),
        notes: String(formData.get("notes") ?? ""),
      },
    });
  } else {
    await prisma.recipeTranslation.upsert({
      where: { recipeId_locale: { recipeId, locale } },
      create: {
        recipeId,
        locale,
        name: String(formData.get("name") ?? "").trim(),
        notes: String(formData.get("notes") ?? "").trim(),
        ingredientNamesJson,
      },
      update: {
        name: String(formData.get("name") ?? "").trim(),
        notes: String(formData.get("notes") ?? "").trim(),
        ingredientNamesJson,
      },
    });
  }
  revalidatePath(`/masters/recipes/${recipeId}`);
  redirect(`/masters/recipes/${recipeId}?locale=${locale}`);
}
