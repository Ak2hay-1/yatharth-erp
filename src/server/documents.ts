"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ContentLocale, DocumentCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT, OPS } from "@/lib/permissions";
import { requiredString } from "@/lib/utils";
import { nextNumberTx } from "@/server/numbers";
import { removeDocumentFile, saveDocumentFile } from "@/lib/document-storage";

function listPath(category: DocumentCategory) {
  return category === "SOP" ? "/quality/sops" : "/quality/documents";
}

function parseCategory(value: FormDataEntryValue | null): DocumentCategory {
  const raw = String(value ?? "");
  if (raw === "SOP" || raw === "OTHER") return raw;
  throw new Error("Invalid document category.");
}

const LOCALES: ContentLocale[] = ["en_IN", "en_US", "en_GB", "hi", "mr"];

function parseLocale(value: FormDataEntryValue | null): ContentLocale {
  const raw = String(value ?? "en_IN");
  if ((LOCALES as string[]).includes(raw)) return raw as ContentLocale;
  return "en_IN";
}

export async function createPlantDocument(formData: FormData) {
  const user = await requireRole(OPS);
  const category = parseCategory(formData.get("category"));
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (category === "OTHER" && !hasFile) {
    throw new Error("Choose a file to upload.");
  }

  let saved: Awaited<ReturnType<typeof saveDocumentFile>> | null = null;
  if (hasFile) {
    saved = await saveDocumentFile(file as File);
  }

  let rowId = "";
  try {
    const row = await prisma.$transaction(async (tx) => {
      const prefix = category === "SOP" ? "SOP" : "DOC";
      const number = await nextNumberTx(tx, prefix);
      return tx.plantDocument.create({
        data: {
          number,
          category,
          title: requiredString(formData.get("title"), "Title"),
          version: String(formData.get("version") ?? "1.0").trim() || "1.0",
          tag: String(formData.get("tag") ?? "").trim(),
          notes: String(formData.get("notes") ?? "").trim(),
          bodyMd: String(formData.get("bodyMd") ?? "").trim(),
          flowchartMermaid: String(formData.get("flowchartMermaid") ?? "").trim(),
          fileName: saved?.fileName ?? "",
          mimeType: saved?.mimeType ?? "",
          sizeBytes: saved?.sizeBytes ?? 0,
          storageKey: saved?.storageKey ?? "",
          uploadedById: user.id,
        },
      });
    });
    rowId = row.id;
  } catch (err) {
    if (saved) await removeDocumentFile(saved.storageKey);
    throw err;
  }

  const base = listPath(category);
  revalidatePath(base);
  redirect(`${base}/${rowId}`);
}

export async function updatePlantDocument(id: string, formData: FormData) {
  await requireRole(OPS);
  const existing = await prisma.plantDocument.findUnique({ where: { id } });
  if (!existing) throw new Error("Document not found.");

  const file = formData.get("file");
  let replacement: Awaited<ReturnType<typeof saveDocumentFile>> | null = null;
  if (file instanceof File && file.size > 0) {
    replacement = await saveDocumentFile(file);
  }

  try {
    const isSop = existing.category === "SOP";
    await prisma.plantDocument.update({
      where: { id },
      data: {
        title: requiredString(formData.get("title"), "Title"),
        version: String(formData.get("version") ?? "1.0").trim() || "1.0",
        tag: String(formData.get("tag") ?? "").trim(),
        notes: String(formData.get("notes") ?? "").trim(),
        ...(isSop
          ? {
              bodyMd: String(formData.get("bodyMd") ?? "").trim(),
              flowchartMermaid: String(formData.get("flowchartMermaid") ?? "").trim(),
            }
          : {}),
        ...(replacement
          ? {
              fileName: replacement.fileName,
              mimeType: replacement.mimeType,
              sizeBytes: replacement.sizeBytes,
              storageKey: replacement.storageKey,
            }
          : {}),
      },
    });
  } catch (err) {
    if (replacement) await removeDocumentFile(replacement.storageKey);
    throw err;
  }

  if (replacement && existing.storageKey) {
    await removeDocumentFile(existing.storageKey);
  }

  const base = listPath(existing.category);
  const locale = String(formData.get("viewLocale") ?? "");
  revalidatePath(base);
  revalidatePath(`${base}/${id}`);
  if (locale) redirect(`${base}/${id}?locale=${locale}`);
}

export async function saveSopTranslation(documentId: string, formData: FormData) {
  await requireRole(OPS);
  const locale = parseLocale(formData.get("locale"));
  if (locale === "en_IN") {
    // Default locale lives on PlantDocument itself
    await updatePlantDocument(documentId, formData);
    return;
  }
  await prisma.sopTranslation.upsert({
    where: { documentId_locale: { documentId, locale } },
    create: {
      documentId,
      locale,
      title: String(formData.get("title") ?? "").trim(),
      bodyMd: String(formData.get("bodyMd") ?? "").trim(),
      flowchartMermaid: String(formData.get("flowchartMermaid") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
    },
    update: {
      title: String(formData.get("title") ?? "").trim(),
      bodyMd: String(formData.get("bodyMd") ?? "").trim(),
      flowchartMermaid: String(formData.get("flowchartMermaid") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
    },
  });
  revalidatePath(`/quality/sops/${documentId}`);
  redirect(`/quality/sops/${documentId}?locale=${locale}`);
}

export async function deletePlantDocument(id: string) {
  await requireRole(MANAGEMENT);
  const existing = await prisma.plantDocument.findUnique({ where: { id } });
  if (!existing) throw new Error("Document not found.");

  await prisma.plantDocument.delete({ where: { id } });
  if (existing.storageKey) await removeDocumentFile(existing.storageKey);

  const base = listPath(existing.category);
  revalidatePath(base);
  redirect(base);
}
