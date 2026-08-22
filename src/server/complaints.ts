"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ComplaintIssue, ComplaintStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OPS } from "@/lib/permissions";
import { requiredString } from "@/lib/utils";
import { nextNumberTx } from "@/server/numbers";
import { removeDocumentFile, saveDocumentFile } from "@/lib/document-storage";

async function saveComplaintFiles(complaintId: string, formData: FormData) {
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    const saved = await saveDocumentFile(file);
    try {
      await prisma.complaintAttachment.create({
        data: {
          complaintId,
          fileName: saved.fileName,
          mimeType: saved.mimeType,
          sizeBytes: saved.sizeBytes,
          storageKey: saved.storageKey,
        },
      });
    } catch (err) {
      await removeDocumentFile(saved.storageKey);
      throw err;
    }
  }
}

export async function createComplaint(formData: FormData) {
  await requireRole(OPS);
  const row = await prisma.$transaction(async (tx) => {
    const number = await nextNumberTx(tx, "CMP");
    const itemId = String(formData.get("itemId") ?? "");
    const batchId = String(formData.get("batchId") ?? "");
    const invoiceId = String(formData.get("invoiceId") ?? "");
    return tx.complaint.create({
      data: {
        number,
        customerId: requiredString(formData.get("customerId"), "Customer"),
        itemId: itemId || null,
        batchId: batchId || null,
        invoiceId: invoiceId || null,
        issue: requiredString(formData.get("issue"), "Issue") as ComplaintIssue,
        description: requiredString(formData.get("description"), "Description"),
      },
    });
  });
  await saveComplaintFiles(row.id, formData);
  revalidatePath("/quality/complaints");
  redirect(`/quality/complaints/${row.id}`);
}

export async function updateComplaint(id: string, formData: FormData) {
  await requireRole(OPS);
  const status = requiredString(formData.get("status"), "Status") as ComplaintStatus;
  await prisma.complaint.update({
    where: { id },
    data: {
      status,
      rootCause: String(formData.get("rootCause") ?? ""),
      correction: String(formData.get("correction") ?? ""),
      resampleNotes: String(formData.get("resampleNotes") ?? ""),
      sopNote: String(formData.get("sopNote") ?? ""),
      closedAt: status === "CLOSED" || status === "STANDARDISED" ? new Date() : null,
    },
  });
  await saveComplaintFiles(id, formData);
  revalidatePath(`/quality/complaints/${id}`);
  revalidatePath("/quality/complaints");
  revalidatePath("/dashboard");
}

export async function deleteComplaintAttachment(id: string) {
  await requireRole(OPS);
  const row = await prisma.complaintAttachment.findUnique({ where: { id } });
  if (!row) throw new Error("Attachment not found");
  await prisma.complaintAttachment.delete({ where: { id } });
  await removeDocumentFile(row.storageKey);
  revalidatePath(`/quality/complaints/${row.complaintId}`);
}

export async function saveMonthlyReview(formData: FormData) {
  await requireRole(OPS);
  const month = requiredString(formData.get("month"), "Month");
  await prisma.monthlyReview.upsert({
    where: { month },
    create: {
      month,
      systemToImprove: String(formData.get("systemToImprove") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    },
    update: {
      systemToImprove: String(formData.get("systemToImprove") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}
