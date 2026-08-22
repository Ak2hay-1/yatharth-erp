import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, Field, Input, PageHeader, Select, Textarea, Badge, Button, LinkButton } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { deleteComplaintAttachment, updateComplaint } from "@/server/complaints";
import { formatDate } from "@/lib/utils";
import { formatFileSize } from "@/lib/document-storage";
import { COMPLAINT_ISSUES, COMPLAINT_STATUSES, labelOf } from "@/lib/labels";

export default async function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.complaint.findUnique({
    where: { id },
    include: {
      customer: true,
      item: true,
      batch: true,
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!row) notFound();
  return (
    <div>
      <PageHeader
        title={row.number}
        subtitle={`${row.customer.name} · ${labelOf(COMPLAINT_ISSUES, row.issue)} · ${formatDate(row.createdAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge tone="warn">{labelOf(COMPLAINT_STATUSES, row.status)}</Badge>
            <LinkButton href={`/api/complaints/${row.id}/rca-pack`} variant="secondary">
              Download RCA pack
            </LinkButton>
          </div>
        }
      />
      <Card className="max-w-2xl space-y-4 p-6">
        <p className="text-sm">
          <span className="text-muted">SKU / lot</span> {row.item?.name ?? "—"} / {row.batch?.lotNo ?? "—"}
        </p>
        <p className="rounded-lg bg-bg p-3 text-sm">{row.description}</p>
        <form action={updateComplaint.bind(null, row.id)} className="grid gap-3" encType="multipart/form-data">
          <Field label="Status">
            <Select name="status" defaultValue={row.status}>
              {COMPLAINT_STATUSES.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Root cause">
            <Textarea name="rootCause" defaultValue={row.rootCause} placeholder="Raw material → mince → binder → cook → freeze…" />
          </Field>
          <Field label="Correction">
            <Textarea name="correction" defaultValue={row.correction} />
          </Field>
          <Field label="New sample / validation">
            <Textarea name="resampleNotes" defaultValue={row.resampleNotes} />
          </Field>
          <Field label="SOP / BMR / QC note to standardise">
            <Input name="sopNote" defaultValue={row.sopNote} />
          </Field>
          <Field label="Add photos / documents">
            <Input
              name="attachments"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx"
              className="file:mr-3 file:rounded-md file:border-0 file:bg-forest file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
          </Field>
          <SubmitButton>Update loop</SubmitButton>
        </form>

        <div className="border-t border-line pt-4">
          <h2 className="font-display mb-2 text-lg">Attachments</h2>
          {row.attachments.length === 0 ? (
            <p className="text-sm text-muted">None yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {row.attachments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={`/api/complaints/attachments/${a.id}/download`}
                    className="font-medium text-saffron hover:underline"
                  >
                    {a.fileName}
                  </a>
                  <span className="text-xs text-muted">{formatFileSize(a.sizeBytes)}</span>
                  <ActionForm action={deleteComplaintAttachment.bind(null, a.id)}>
                    <Button type="submit" variant="danger">
                      Remove
                    </Button>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
