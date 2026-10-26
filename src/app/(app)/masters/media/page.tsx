import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT, OPS, can } from "@/lib/permissions";
import { Card, PageHeader, Empty, Button } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { ProductAssetUploadForm } from "@/components/product-asset-upload-form";
import { deleteProductAsset } from "@/server/product-assets";
import { formatDate } from "@/lib/utils";
import { formatFileSize } from "@/lib/document-storage";
import { PRODUCT_ASSET_KINDS, labelOf } from "@/lib/labels";

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string; page?: string }>;
}) {
  const user = await requireRole(OPS);
  const canManage = can(user.role, MANAGEMENT);
  const canDelete = canManage;
  const sp = await searchParams;
  const filterItemId = sp.itemId;
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 24;

  const assetWhere = filterItemId ? { itemId: filterItemId } : undefined;
  const [items, assets, assetCount] = await Promise.all([
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
      where: assetWhere,
      include: { item: { select: { id: true, name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productAsset.count({ where: assetWhere }),
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
          <ProductAssetUploadForm items={items} filterItemId={filterItemId} canManage={canManage} />
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
            {assetCount > pageSize ? (
              <div className="mt-4 flex gap-3 text-sm">
                {page > 1 ? (
                  <a className="text-saffron" href={`/masters/media?page=${page - 1}${filterItemId ? `&itemId=${filterItemId}` : ""}`}>
                    Previous
                  </a>
                ) : null}
                <span className="text-muted">
                  Page {page} of {Math.ceil(assetCount / pageSize)}
                </span>
                {page * pageSize < assetCount ? (
                  <a className="text-saffron" href={`/masters/media?page=${page + 1}${filterItemId ? `&itemId=${filterItemId}` : ""}`}>
                    Next
                  </a>
                ) : null}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
