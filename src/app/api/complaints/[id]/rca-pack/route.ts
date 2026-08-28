import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OPS } from "@/lib/permissions";
import { readDocumentBytes } from "@/lib/document-storage";
import { formatDate } from "@/lib/utils";
import { COMPLAINT_ISSUES, COMPLAINT_STATUSES, labelOf } from "@/lib/labels";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireRole(OPS);
  const { id } = await context.params;
  const row = await prisma.complaint.findUnique({
    where: { id },
    include: {
      customer: true,
      item: true,
      batch: true,
      attachments: true,
    },
  });
  if (!row) return new Response("Not found", { status: 404 });

  const summary = [
    `Complaint ${row.number}`,
    `Status: ${labelOf(COMPLAINT_STATUSES, row.status)}`,
    `Customer: ${row.customer.name}`,
    `Issue: ${labelOf(COMPLAINT_ISSUES, row.issue)}`,
    `SKU: ${row.item?.name ?? "—"}`,
    `Lot: ${row.batch?.lotNo ?? "—"}`,
    `Logged: ${formatDate(row.createdAt)}`,
    `Closed: ${formatDate(row.closedAt)}`,
    "",
    "Description:",
    row.description,
    "",
    "Root cause:",
    row.rootCause || "—",
    "",
    "Correction:",
    row.correction || "—",
    "",
    "New sample / validation:",
    row.resampleNotes || "—",
    "",
    "SOP / BMR / QC note:",
    row.sopNote || "—",
    "",
    `Attachments: ${row.attachments.length}`,
  ].join("\r\n");

  const zip = new JSZip();
  zip.file("rca-summary.txt", summary);
  for (const att of row.attachments) {
    try {
      const bytes = await readDocumentBytes(att.storageKey);
      zip.file(att.fileName, bytes);
    } catch {
      zip.file(`MISSING-${att.fileName}.txt`, `File missing: ${att.storageKey}`);
    }
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const filename = `${row.number}-rca-pack.zip`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
