"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ProductAssetKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT, OPS } from "@/lib/permissions";
import { requiredString } from "@/lib/utils";
import { removeDocumentFile, saveDocumentFile } from "@/lib/document-storage";

export async function createProductAsset(formData: FormData) {
  await requireRole(OPS);
  const itemId = requiredString(formData.get("itemId"), "Product");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) throw new Error("Choose an image or file.");
  const saved = await saveDocumentFile(file);
  try {
    await prisma.productAsset.create({
      data: {
        itemId,
        kind: (String(formData.get("kind") || "OTHER") as ProductAssetKind) || "OTHER",
        title: String(formData.get("title") ?? "").trim(),
        notes: String(formData.get("notes") ?? "").trim(),
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
  revalidatePath("/masters/media");
  revalidatePath(`/masters/items/${itemId}`);
  redirect("/masters/media");
}

export async function deleteProductAsset(id: string) {
  await requireRole(MANAGEMENT);
  const row = await prisma.productAsset.findUnique({ where: { id } });
  if (!row) throw new Error("Not found");
  await prisma.productAsset.delete({ where: { id } });
  await removeDocumentFile(row.storageKey);
  revalidatePath("/masters/media");
  revalidatePath(`/masters/items/${row.itemId}`);
}
