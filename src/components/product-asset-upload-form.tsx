"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogItem } from "@/components/catalog-types";
import { NamedSearch } from "@/components/named-search";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { PRODUCT_ASSET_KINDS } from "@/lib/labels";
import { productImageError } from "@/lib/product-image";

export function ProductAssetUploadForm({
  items,
  filterItemId,
  canManage,
}: {
  items: CatalogItem[];
  filterItemId?: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <form
      key={formKey}
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        const form = event.currentTarget;
        const body = new FormData(form);
        if (!String(body.get("itemId") ?? "").trim()) {
          setError("Choose a product.");
          return;
        }
        const file = body.get("file");
        if (!(file instanceof File)) {
          setError("Choose an image or file.");
          return;
        }
        const invalid = productImageError(file);
        if (invalid) {
          setError(invalid);
          return;
        }

        setPending(true);
        try {
          const res = await fetch("/api/product-assets", { method: "POST", body });
          if (!res.ok) {
            const message = (await res.text()).trim();
            setError(message || "Upload failed.");
            return;
          }
          setFormKey((key) => key + 1);
          router.refresh();
        } catch {
          setError("Upload failed.");
        } finally {
          setPending(false);
        }
      }}
    >
      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-bad" role="alert">
          {error}
        </p>
      ) : null}
      <Field label="Product">
        <NamedSearch
          name="itemId"
          required
          defaultValue={filterItemId ?? ""}
          placeholder="Type SKU or name"
          create="item"
          canCreate={canManage}
          defaultType="FINISHED"
          items={items}
        />
      </Field>
      <Field label="Kind">
        <Select name="kind" defaultValue="PACK_SHOT">
          {PRODUCT_ASSET_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Title">
        <Input name="title" placeholder="Front pack — Apr 2026" />
      </Field>
      <Field label="File">
        <Input
          name="file"
          type="file"
          required
          accept=".png,.jpg,.jpeg,.webp,.gif,.pdf"
          className="file:mr-3 file:rounded-md file:border-0 file:bg-forest file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
      </Field>
      <Field label="Notes">
        <Textarea name="notes" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}
