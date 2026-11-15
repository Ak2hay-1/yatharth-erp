import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { WebsiteCatalogForm } from "@/components/website-catalog-form";

export default async function EditWebsiteCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; uploadError?: string }>;
}) {
  await requireRole(MANAGEMENT);
  const { id } = await params;
  const sp = await searchParams;
  const saved = sp.saved;
  const uploadError = sp.uploadError;
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      label: { select: { vegNonVeg: true, servingsPerPack: true } },
      productAssets: {
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, fileName: true, mimeType: true },
      },
    },
  });
  if (!item || item.type !== "FINISHED") notFound();

  return (
    <div>
      <PageHeader
        title={item.name}
        subtitle={`${item.sku} · Website catalog`}
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/masters/items/${item.id}`} variant="secondary">
              Full item
            </LinkButton>
            <LinkButton href="/masters/website-catalog" variant="secondary">
              Back
            </LinkButton>
          </div>
        }
      />
      {saved ? <p className="mb-4 text-sm text-ok">Saved. Changes queue for website sync when enabled.</p> : null}
      {uploadError ? (
        <p className="mb-4 text-sm text-bad" role="alert">
          {uploadError}
        </p>
      ) : null}
      <Card className="p-6">
        <WebsiteCatalogForm item={item} />
      </Card>
    </div>
  );
}
