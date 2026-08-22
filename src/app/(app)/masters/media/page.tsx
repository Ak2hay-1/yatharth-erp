import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT, OPS, can } from "@/lib/permissions";
import { Card, Field, Input, PageHeader, Select, Textarea, Empty, Button } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { NamedSearch } from "@/components/named-search";
import { createProductAsset, deleteProductAsset } from "@/server/product-assets";
import { formatDate } from "@/lib/utils";
import { formatFileSize } from "@/lib/document-storage";
import { PRODUCT_ASSET_KINDS, labelOf } from "@/lib/labels";

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string }>;
}) {
  const user = await requireRole(OPS);
  const canManage = can(user.role, MANAGEMENT);
  const canDelete = canManage;
  const { itemId: filterItemId } = await searchParams;

  const [items, assets] = await Promise.all([
    prisma.item.findMany({
      where: { type: "FINISHED", isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        sellingPrice: true,
        purchasePrice: true,
        gstRate: true,
        type: true,
      },
    }),
    prisma.productAsset.findMany({
      where: filterItemId ? { itemId: filterItemId } : undefined,
      include: { item: { select: { id: true, name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Product images"
        subtitle="Marketing pack shots and record-keeping photos linked to SKUs."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit p-6">
          <h2 className="font-display mb-4 text-lg">Upload</h2>
          <ActionForm action={createProductAsset} className="space-y-3">
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
            <SubmitButton>Upload</SubmitButton>
          </ActionForm>
        </Card>

        <div className="lg:col-span-2">
          <Card className="p-4">
            {assets.length === 0 ? (
              <Empty>No images uploaded yet.</Empty>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {assets.map((a) => {
                  const isImage = a.mimeType.startsWith("image/");
                  return (
                    <li key={a.id} className="rounded-lg border border-line p-3">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/product-assets/${a.id}`}
                          alt={a.title || a.fileName}
                          className="mb-2 h-40 w-full rounded-md object-cover bg-bg"
                        />
                      ) : (
                        <div className="mb-2 flex h-40 items-center justify-center rounded-md bg-bg text-sm text-muted">
                          {a.fileName}
                        </div>
                      )}
                      <div className="font-medium">{a.title || a.fileName}</div>
                      <div className="text-xs text-muted">
                        {a.item.name} · {labelOf(PRODUCT_ASSET_KINDS, a.kind)} · {formatFileSize(a.sizeBytes)} ·{" "}
                        {formatDate(a.createdAt)}
                      </div>
                      {a.notes ? <p className="mt-1 text-xs text-muted">{a.notes}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href={`/api/product-assets/${a.id}`}
                          className="text-sm font-semibold text-saffron hover:underline"
                          download={a.fileName}
                        >
                          Download
                        </a>
                        {canDelete ? (
                          <ActionForm action={deleteProductAsset.bind(null, a.id)}>
                            <Button type="submit" variant="danger">
                              Delete
                            </Button>
                          </ActionForm>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
