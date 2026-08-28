import type { Recipe, RecipeLine } from "@prisma/client";
import { Card, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { LineEditor, recipeLineRow, type CatalogItem, type LineRow } from "@/components/line-editor";
import { NamedSearch } from "@/components/named-search";

export { ItemForm, PartyForm, type ItemFormSeed, type PartyFormSeed } from "@/components/item-party-forms";

export function RecipeForm({
  action,
  items,
  recipe,
}: {
  action: (formData: FormData) => void | Promise<void>;
  items: CatalogItem[];
  recipe?: Recipe & { lines: RecipeLine[] };
}) {
  const finished = items.filter((i) => i.type === "FINISHED");
  const ingredients = items.filter((i) => i.type !== "FINISHED");
  const byId = Object.fromEntries(ingredients.map((i) => [i.id, i]));
  const initial: LineRow[] | undefined = recipe?.lines.map((l) => {
    const item = byId[l.itemId];
    if (!item) {
      return { itemId: l.itemId, qty: String(l.qty), rate: "0" };
    }
    return recipeLineRow(l.itemId, l.qty, item.unit);
  });
  return (
    <ActionForm action={action} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Recipe name">
          <Input name="name" required defaultValue={recipe?.name} placeholder="Veg patty 10 kg batch" />
        </Field>
        <Field label="Finished product">
          <NamedSearch
            name="finishedItemId"
            required
            defaultValue={recipe?.finishedItemId ?? ""}
            placeholder="Type finished SKU"
            create="item"
            canCreate={!recipe}
            defaultType="FINISHED"
            items={finished}
            disabled={!!recipe}
          />
        </Field>
        <Field label="Standard output qty">
          <Input name="outputQty" type="number" step="0.001" required defaultValue={recipe?.outputQty ?? 1} />
        </Field>
        <Field label="Notes">
          <Input name="notes" defaultValue={recipe?.notes} />
        </Field>
      </div>
      <Card className="p-4">
        <h3 className="mb-3 font-semibold">Ingredients per standard batch</h3>
        <LineEditor
          items={ingredients}
          initial={initial}
          rateField="purchasePrice"
          canCreate
          defaultType="RAW"
          unitMode="recipe"
        />
      </Card>
      <SubmitButton>{recipe ? "Save recipe" : "Create recipe"}</SubmitButton>
    </ActionForm>
  );
}
