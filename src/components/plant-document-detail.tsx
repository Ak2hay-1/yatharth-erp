import { notFound } from "next/navigation";
import type { ContentLocale, DocumentCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, Field, Input, PageHeader, Select, Textarea, Badge, Button, LinkButton } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { deletePlantDocument, saveSopTranslation, updatePlantDocument } from "@/server/documents";
import { formatDate } from "@/lib/utils";
import { formatFileSize } from "@/lib/document-storage";
import { CONTENT_LOCALES, DOCUMENT_TAGS, labelOf } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { MANAGEMENT, OPS, can } from "@/lib/permissions";
import { MermaidEditorField, MermaidPreview } from "@/components/mermaid-editor";

const BASE: Record<DocumentCategory, string> = {
  SOP: "/quality/sops",
  OTHER: "/quality/documents",
};

const LOCALES = CONTENT_LOCALES.map((x) => x.value);

function parseLocale(raw: string | undefined): ContentLocale {
  if (raw && (LOCALES as string[]).includes(raw)) return raw as ContentLocale;
  return "en_IN";
}

export async function PlantDocumentDetail({
  category,
  id,
  localeRaw,
}: {
  category: DocumentCategory;
  id: string;
  localeRaw?: string;
}) {
  const user = await requireRole(OPS);
  const locale = parseLocale(localeRaw);
  const row = await prisma.plantDocument.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { name: true } },
      translations: true,
    },
  });
  if (!row || row.category !== category) notFound();

  const translation = row.translations.find((t) => t.locale === locale);
  const title = locale === "en_IN" ? row.title : translation?.title || row.title;
  const bodyMd = locale === "en_IN" ? row.bodyMd : translation?.bodyMd || "";
  const flowchart = locale === "en_IN" ? row.flowchartMermaid : translation?.flowchartMermaid || "";
  const notes = locale === "en_IN" ? row.notes : translation?.notes || "";

  const base = BASE[category];
  const canDelete = can(user.role, MANAGEMENT);
  const saveAction =
    category === "SOP" && locale !== "en_IN"
      ? saveSopTranslation.bind(null, row.id)
      : updatePlantDocument.bind(null, row.id);

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={`${row.number} · v${row.version} · updated ${formatDate(row.updatedAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {row.storageKey ? (
              <LinkButton href={`/api/documents/${row.id}/download`} variant="secondary">
                Download file
              </LinkButton>
            ) : null}
            <LinkButton href={base} variant="secondary">
              Back to list
            </LinkButton>
          </div>
        }
      />

      {category === "SOP" ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {CONTENT_LOCALES.map((loc) => (
            <LinkButton
              key={loc.value}
              href={`${base}/${row.id}?locale=${loc.value}`}
              variant={locale === loc.value ? "primary" : "secondary"}
            >
              {loc.label}
            </LinkButton>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <div className="flex flex-wrap gap-2 text-sm text-muted">
            {row.fileName ? (
              <span>
                File: <span className="text-ink">{row.fileName}</span> ({formatFileSize(row.sizeBytes)})
              </span>
            ) : (
              <span>No attachment file</span>
            )}
            {row.uploadedBy ? <span>· Uploaded by {row.uploadedBy.name}</span> : null}
            {row.tag ? <Badge tone="neutral">{labelOf(DOCUMENT_TAGS, row.tag) || row.tag}</Badge> : null}
            {category === "SOP" ? <Badge tone="ok">{labelOf(CONTENT_LOCALES, locale)}</Badge> : null}
          </div>

          <ActionForm action={saveAction} className="grid gap-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="viewLocale" value={locale} />
            <Field label="Title">
              <Input name="title" required defaultValue={title} />
            </Field>
            {locale === "en_IN" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Version">
                  <Input name="version" defaultValue={row.version} />
                </Field>
                {category === "OTHER" ? (
                  <Field label="Type">
                    <Select name="tag" defaultValue={row.tag}>
                      {DOCUMENT_TAGS.map((x) => (
                        <option key={x.value || "none"} value={x.value}>
                          {x.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : (
                  <input type="hidden" name="tag" value={row.tag} />
                )}
              </div>
            ) : (
              <>
                <input type="hidden" name="version" value={row.version} />
                <input type="hidden" name="tag" value={row.tag} />
              </>
            )}

            {category === "SOP" ? (
              <>
                <Field label="Procedure (markdown)">
                  <Textarea name="bodyMd" rows={10} defaultValue={bodyMd} className="font-mono text-xs" />
                </Field>
                <MermaidEditorField name="flowchartMermaid" defaultValue={flowchart} />
              </>
            ) : null}

            {locale === "en_IN" ? (
              <Field label="Replace / add file (optional)">
                <Input
                  name="file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  className="file:mr-3 file:rounded-md file:border-0 file:bg-forest file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
              </Field>
            ) : null}
            <Field label="Notes">
              <Textarea name="notes" defaultValue={notes} />
            </Field>
            <SubmitButton>Save changes</SubmitButton>
          </ActionForm>

          {canDelete && locale === "en_IN" ? (
            <ActionForm action={deletePlantDocument.bind(null, row.id)} className="border-t border-line pt-4">
              <Button type="submit" variant="danger">
                Delete {category === "SOP" ? "SOP" : "document"}
              </Button>
            </ActionForm>
          ) : null}
        </Card>

        {category === "SOP" ? (
          <Card className="space-y-4 p-6">
            <h2 className="font-display text-lg">Preview</h2>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">{bodyMd || "No procedure text."}</div>
            {flowchart ? (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Flowchart</h3>
                <MermaidPreview chart={flowchart} />
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
