import type { DocumentCategory } from "@prisma/client";
import { Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { createPlantDocument } from "@/server/documents";
import { requireRole } from "@/lib/session";
import { OPS } from "@/lib/permissions";
import { DOCUMENT_TAGS } from "@/lib/labels";
import { MermaidEditorField } from "@/components/mermaid-editor";

const META: Record<DocumentCategory, { title: string; back: string }> = {
  SOP: { title: "New SOP", back: "/quality/sops" },
  OTHER: { title: "Upload document", back: "/quality/documents" },
};

export async function PlantDocumentNew({ category }: { category: DocumentCategory }) {
  await requireRole(OPS);
  const meta = META[category];

  return (
    <div>
      <PageHeader
        title={meta.title}
        subtitle={
          category === "SOP"
            ? "Write the procedure, add a Mermaid flowchart, optionally attach a file (up to 25 MB)."
            : "PDF, images, or Office files up to 25 MB."
        }
      />
      <Card className="max-w-3xl p-6">
        <ActionForm action={createPlantDocument} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="category" value={category} />
          <Field label="Title" className="md:col-span-2">
            <Input
              name="title"
              required
              placeholder={category === "SOP" ? "e.g. Chicken patty fry SOP" : "e.g. FSSAI licence 2026"}
            />
          </Field>
          <Field label="Version">
            <Input name="version" defaultValue="1.0" placeholder="1.0" />
          </Field>
          {category === "OTHER" ? (
            <Field label="Type">
              <Select name="tag" defaultValue="">
                {DOCUMENT_TAGS.map((x) => (
                  <option key={x.value || "none"} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <input type="hidden" name="tag" value="" />
          )}
          {category === "SOP" ? (
            <>
              <Field label="Procedure (markdown)" className="md:col-span-2">
                <Textarea name="bodyMd" rows={8} className="font-mono text-xs" placeholder="1. Thaw…&#10;2. Season…" />
              </Field>
              <div className="md:col-span-2">
                <MermaidEditorField name="flowchartMermaid" />
              </div>
            </>
          ) : null}
          <Field label={category === "SOP" ? "Attachment file (optional)" : "File"} className="md:col-span-2">
            <Input
              name="file"
              type="file"
              required={category === "OTHER"}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
              className="file:mr-3 file:rounded-md file:border-0 file:bg-forest file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <Textarea name="notes" placeholder="Optional context for the plant team" />
          </Field>
          <div className="md:col-span-2">
            <SubmitButton>{category === "SOP" ? "Save SOP" : "Save document"}</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
