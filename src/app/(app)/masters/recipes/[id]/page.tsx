import { notFound } from "next/navigation";
import type { ContentLocale } from "@prisma/client";
import { Card, Field, Input, PageHeader, Textarea, LinkButton } from "@/components/ui";
import { RecipeForm } from "@/components/master-forms";
import { RecipeScalePreview } from "@/components/recipe-scale-preview";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { saveRecipeTranslation, updateRecipe } from "@/server/recipes";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { CONTENT_LOCALES, labelOf } from "@/lib/labels";
import { UnitConverter } from "@/components/unit-converter";
import { PrintButton } from "@/components/print-button";

const LOCALES = CONTENT_LOCALES.map((x) => x.value);

function parseLocale(raw: string | undefined): ContentLocale {
  if (raw && (LOCALES as string[]).includes(raw)) return raw as ContentLocale;
  return "en_IN";
}

export default async function EditRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  await requireRole(MANAGEMENT);
  const { id } = await params;
  const locale = parseLocale((await searchParams).locale);
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      finishedItem: true,
      lines: { include: { item: true } },
      translations: true,
    },
  });
  if (!recipe) notFound();
  const items = await prisma.item.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const translation = recipe.translations.find((t) => t.locale === locale);
  const displayName = locale === "en_IN" ? recipe.name : translation?.name || recipe.name;
  const displayNotes = locale === "en_IN" ? recipe.notes : translation?.notes || "";
  let ingredientOverrides: Record<string, string> = {};
  try {
    ingredientOverrides = JSON.parse(translation?.ingredientNamesJson || "{}") as Record<string, string>;
  } catch {
    ingredientOverrides = {};
  }

  return (
    <div>
      <PageHeader
        title={displayName}
        subtitle={`Language: ${labelOf(CONTENT_LOCALES, locale)}`}
        actions={
          <div className="flex flex-wrap gap-2 no-print">
            <PrintButton label="Print recipe" />
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2 no-print">
        {CONTENT_LOCALES.map((loc) => (
          <LinkButton
            key={loc.value}
            href={`/masters/recipes/${recipe.id}?locale=${loc.value}`}
            variant={locale === loc.value ? "primary" : "secondary"}
          >
            {loc.label}
          </LinkButton>
        ))}
      </div>

      <UnitConverter className="mb-4 p-4 no-print" />

      <div className="grid gap-4 xl:grid-cols-2">
        {locale === "en_IN" ? (
          <Card className="p-6 no-print">
            <RecipeForm action={updateRecipe.bind(null, recipe.id)} items={items} recipe={recipe} />
          </Card>
        ) : (
          <Card className="p-6 no-print">
            <p className="mb-4 text-sm text-muted">
              Quantities stay on the English (India) recipe. Edit translated name, notes, and ingredient display names
              here.
            </p>
            <ActionForm action={saveRecipeTranslation.bind(null, recipe.id)} className="space-y-3">
              <input type="hidden" name="locale" value={locale} />
              <Field label="Recipe name">
                <Input name="name" defaultValue={displayName} required />
              </Field>
              <Field label="Notes">
                <Textarea name="notes" defaultValue={displayNotes} />
              </Field>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ingredient names</p>
                {recipe.lines.map((line) => (
                  <Field key={line.id} label={line.item.name}>
                    <Input
                      name={`ing_${line.itemId}`}
                      defaultValue={ingredientOverrides[line.itemId] ?? ""}
                      placeholder={`Translation of ${line.item.name}`}
                    />
                  </Field>
                ))}
              </div>
              <SubmitButton>Save translation</SubmitButton>
            </ActionForm>
          </Card>
        )}
        <RecipeScalePreview
          outputQty={recipe.outputQty}
          outputUnit={recipe.finishedItem.unit}
          lines={recipe.lines.map((l) => ({
            name: ingredientOverrides[l.itemId] || l.item.name,
            unit: l.item.unit,
            qty: l.qty,
          }))}
        />
      </div>
    </div>
  );
}
