"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ContentLocale } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { parseNum, requiredString } from "@/lib/utils";

type Line = { itemId: string; qty: number };

const LOCALES: ContentLocale[] = ["en_IN", "en_US", "en_GB", "hi", "mr"];

function parseLocale(value: FormDataEntryValue | null): ContentLocale {
  const raw = String(value ?? "en_IN");
  if ((LOCALES as string[]).includes(raw)) return raw as ContentLocale;
  return "en_IN";
}

function parseLines(formData: FormData): Line[] {
  const raw = JSON.parse(String(formData.get("lines") ?? "[]")) as Line[];
  const lines = raw.filter((l) => l.itemId && l.qty > 0);
  if (!lines.length) throw new Error("Add at least one ingredient");
  return lines;
}

export async function createRecipe(formData: FormData) {
  await requireRole(MANAGEMENT);
  const finishedItemId = requiredString(formData.get("finishedItemId"), "Finished product");
  const existing = await prisma.recipe.findUnique({ where: { finishedItemId } });
  if (existing) throw new Error("A recipe already exists for this product");
  const lines = parseLines(formData);
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
  const lines = parseLines(formData);
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
