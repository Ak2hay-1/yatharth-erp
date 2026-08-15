import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT, FINANCE, can } from "@/lib/permissions";
import { Card, Field, Input, PageHeader, LinkButton, Button } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { CostingCalculator } from "@/components/costing-calculator";
import {
  deleteCostAttachment,
  refreshMfgCost,
  saveItemCosting,
  uploadCostAttachment,
} from "@/server/item-costing";
import { getCompanyMarkups } from "@/server/costing";
import { formatDate } from "@/lib/utils";
import { formatFileSize as fmtSize } from "@/lib/document-storage";

export default async function CostingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireRole(FINANCE);
  const canEdit = can(user.role, MANAGEMENT);
  const { itemId } = await params;
  const saved = (await searchParams).saved;
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { costAttachments: { orderBy: { createdAt: "desc" } }, recipeOutput: true },
  });
  if (!item || item.type !== "FINISHED") notFound();
  const company = await getCompanyMarkups();

  return (
    <div>
      <PageHeader
        title={item.name}
        subtitle={`${item.sku} · Product costing & rate calculator`}
        actions={
          <LinkButton href="/masters/costing" variant="secondary">
            Back to list
          </LinkButton>
        }
      />
      {saved ? <p className="mb-4 text-sm text-ok">Saved.</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 p-6 lg:col-span-2">
          {canEdit ? (
            <>
              <div className="flex flex-wrap gap-2">
                {item.recipeOutput ? (
                  <ActionForm action={refreshMfgCost.bind(null, item.id)}>
                    <input type="hidden" name="source" value="RECIPE" />
                    <SubmitButton>Refresh from recipe</SubmitButton>
                  </ActionForm>
                ) : null}
                <ActionForm action={refreshMfgCost.bind(null, item.id)}>
                  <input type="hidden" name="source" value="LAST_BATCH" />
                  <SubmitButton>Refresh from last batch</SubmitButton>
                </ActionForm>
              </div>
              <CostingCalculator
                action={saveItemCosting.bind(null, item.id)}
                company={company}
                defaults={{
                  mfgCost: item.mfgCost,
                  mfgCostSource: item.mfgCostSource,
                  usp: item.usp,
                  rateB2b: item.rateB2b,
                  rateWholesale: item.rateWholesale,
                  rateDistributor: item.rateDistributor,
                  rateMrp: item.rateMrp,
                  overrideB2bPct: item.overrideB2bPct,
                  overrideWholesalePct: item.overrideWholesalePct,
                  overrideDistributorPct: item.overrideDistributorPct,
                  overrideMrpPct: item.overrideMrpPct,
                }}
              />
            </>
          ) : (
            <p className="text-sm text-muted">View only. Ask an Admin to edit rates.</p>
          )}
        </Card>

        <Card className="h-fit space-y-4 p-6">
          <h2 className="font-display text-lg">Cost sheets</h2>
          <p className="text-sm text-muted">Upload supporting PDF/Excel for manufacturing cost records.</p>
          {canEdit ? (
            <ActionForm action={uploadCostAttachment.bind(null, item.id)} className="space-y-3">
              <Field label="File">
                <Input
                  name="file"
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.csv,.doc,.docx"
                  className="file:mr-3 file:rounded-md file:border-0 file:bg-forest file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
              </Field>
              <Field label="Notes">
                <Input name="notes" />
              </Field>
              <SubmitButton>Upload</SubmitButton>
            </ActionForm>
          ) : null}
          <ul className="space-y-2 text-sm">
            {item.costAttachments.length === 0 ? (
              <li className="text-muted">No attachments yet.</li>
            ) : (
              item.costAttachments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2">
                  <div>
                    <a
                      href={`/api/cost-attachments/${a.id}/download`}
                      className="font-medium text-saffron hover:underline"
                    >
                      {a.fileName}
                    </a>
                    <div className="text-xs text-muted">
                      {fmtSize(a.sizeBytes)} · {formatDate(a.createdAt)}
                    </div>
                  </div>
                  {canEdit ? (
                    <ActionForm action={deleteCostAttachment.bind(null, a.id)}>
                      <Button type="submit" variant="danger">
                        Delete
                      </Button>
                    </ActionForm>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
