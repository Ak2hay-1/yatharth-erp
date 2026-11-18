"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Item, ItemLabel, ProductAsset } from "@prisma/client";
import { Field, Input, Select, Button } from "@/components/ui";
import { PACK_TYPES, PRODUCT_LANES, SKU_TIERS } from "@/lib/labels";
import { UNITS, rethrowRedirect } from "@/lib/utils";
import { actionErrorMessage } from "@/lib/filters";
import { isActionError, isActionRedirect } from "@/lib/run-action";
import { uploadProductAssetDirect } from "@/lib/product-asset-upload";
import {
  createWebsiteCatalogProduct,
  updateWebsiteCatalogProduct,
} from "@/server/website-catalog";

type CatalogItem = Item & {
  label: Pick<ItemLabel, "vegNonVeg" | "servingsPerPack"> | null;
  productAssets: Pick<ProductAsset, "id" | "title" | "fileName" | "mimeType">[];
};

export function WebsiteCatalogForm({ item }: { item?: CatalogItem }) {
  const router = useRouter();
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const packShot = item?.productAssets.find((a) => a.mimeType.startsWith("image/")) ?? item?.productAssets[0];

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (lock.current) return;
        lock.current = true;
        setPending(true);
        setError(null);

        const form = event.currentTarget;
        const formData = new FormData(form);
        const file = formData.get("file");
        formData.delete("file");

        try {
          const action = item
            ? updateWebsiteCatalogProduct.bind(null, item.id)
            : createWebsiteCatalogProduct;
          const result = await action(formData);
          if (isActionError(result)) {
            setError(result.error);
            return;
          }

          const id = result && typeof result === "object" && "id" in result ? String(result.id) : item?.id;
          if (file instanceof File && file.size > 0) {
            if (!id) {
              setError("Product saved, but image upload needs a product id.");
              return;
            }
            try {
              await uploadProductAssetDirect({
                itemId: id,
                file,
                kind: "PACK_SHOT",
                title: String(formData.get("imageTitle") ?? "").trim() || "Pack shot",
              });
            } catch (uploadErr) {
              const message =
                uploadErr instanceof Error ? uploadErr.message : "Product saved, but image upload failed.";
              setTimeout(
                () =>
                  router.push(
                    `/masters/website-catalog/${id}?saved=1&uploadError=${encodeURIComponent(message)}`,
                  ),
                0,
              );
              return;
            }
          }

          const href = isActionRedirect(result) ? result.redirectTo : "/masters/website-catalog";
          setTimeout(() => router.push(href), 0);
          router.refresh();
        } catch (e) {
          rethrowRedirect(e);
          setError(actionErrorMessage(e));
        } finally {
          lock.current = false;
          setPending(false);
        }
      }}
    >
      {error ? (
        <p className="md:col-span-2 mb-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-bad" role="alert">
          {error}
        </p>
      ) : null}

      <Field label="SKU">
        <Input name="sku" required defaultValue={item?.sku} placeholder="FG-PATTY-VEG-10" />
      </Field>
      <Field label="Name">
        <Input
          name="name"
          required
          defaultValue={item?.name}
          placeholder="Veg burger patty 80g (10 pcs)"
        />
      </Field>

      <Field label="Unit">
        <Select name="unit" defaultValue={item?.unit ?? "pcs"} required>
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </Select>
      </Field>
      <Field label="HSN">
        <Input name="hsn" defaultValue={item?.hsn} placeholder="1601" />
      </Field>

      <Field label="Product lane">
        <Select name="lane" defaultValue={item?.lane ?? "NONE"}>
          {PRODUCT_LANES.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="SKU tier">
        <Select name="tier" defaultValue={item?.tier ?? "NONE"}>
          {SKU_TIERS.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Pack type">
        <Select name="packType" defaultValue={item?.packType ?? "NONE"}>
          {PACK_TYPES.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Pack size">
        <Input name="packSize" defaultValue={item?.packSize} placeholder="10 x 80 g / 1 kg" />
      </Field>

      <Field label="Website description" className="md:col-span-2">
        <Input
          name="websiteDescription"
          defaultValue={item?.websiteDescription ?? ""}
          placeholder="Short product blurb for the public product page"
        />
      </Field>

      <Field label="Veg / non-veg">
        <Select
          name="vegNonVeg"
          defaultValue={
            item?.label?.vegNonVeg && item.label.vegNonVeg !== "NA"
              ? item.label.vegNonVeg
              : item?.lane === "CHICKEN"
                ? "NON_VEG"
                : item?.lane && item.lane !== "NONE"
                  ? "VEG"
                  : "NA"
          }
          required
        >
          <option value="NA">—</option>
          <option value="VEG">Vegetarian</option>
          <option value="NON_VEG">Non-vegetarian</option>
        </Select>
      </Field>
      <Field label="Units / servings per pack">
        <Input
          name="servingsPerPack"
          defaultValue={item?.label?.servingsPerPack ?? ""}
          placeholder="10"
        />
      </Field>

      <Field label="USP unit price (₹)">
        <Input name="usp" type="number" step="0.01" min="0" defaultValue={item?.usp ?? 0} />
      </Field>
      <Field label="B2B packet rate (₹)">
        <Input name="rateB2b" type="number" step="0.01" min="0" defaultValue={item?.rateB2b ?? 0} />
      </Field>

      <Field label="GST %">
        <Input name="gstRate" type="number" step="0.01" min="0" defaultValue={item?.gstRate ?? 5} />
      </Field>
      <Field label="Shelf life (days)">
        <Input
          name="shelfLifeDays"
          type="number"
          min="1"
          defaultValue={item?.shelfLifeDays ?? 30}
        />
      </Field>

      <div className="md:col-span-2 rounded-lg border border-line bg-bg/40 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Pack shot</p>
        {packShot ? (
          <div className="mb-3 flex items-start gap-3">
            {packShot.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/product-assets/${packShot.id}`}
                alt={packShot.title || packShot.fileName}
                className="h-24 w-24 rounded-md object-cover bg-card"
              />
            ) : null}
            <p className="text-sm text-muted">
              Current: <span className="text-ink">{packShot.title || packShot.fileName}</span>
              <br />
              Upload a new file below to replace on the website after sync.
            </p>
          </div>
        ) : (
          <p className="mb-3 text-sm text-muted">No pack shot yet. Upload one for the public product card.</p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Image title">
            <Input name="imageTitle" placeholder="Front pack" />
          </Field>
          <Field label={item ? "New image (optional)" : "Image"}>
            <Input name="file" type="file" accept=".png,.jpg,.jpeg,.webp,.gif" required={!item} />
          </Field>
        </div>
      </div>

      <div className="md:col-span-2">
        <input type="hidden" name="activeFlag" value="1" />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            value="true"
            defaultChecked={item?.isActive !== false}
            className="accent-[var(--saffron,#fe7733)]"
          />
          Show on website (active)
        </label>
      </div>

      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : item ? "Save catalog product" : "Add to website catalog"}
        </Button>
      </div>
    </form>
  );
}
