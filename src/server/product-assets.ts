"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { removeDocumentFile } from "@/lib/document-storage";
import { enqueueWebsiteSync } from "@/lib/website-sync";

export async function deleteProductAsset(id: string) {
  await requireRole(MANAGEMENT);
  const row = await prisma.productAsset.findUnique({ where: { id } });
  if (!row) throw new Error("Not found");
  await prisma.productAsset.delete({ where: { id } });
  await removeDocumentFile(row.storageKey);
  const item = await prisma.item.findUnique({ where: { id: row.itemId }, select: { sku: true, type: true } });
  if (item?.type === "FINISHED") {
    void enqueueWebsiteSync("products");
    void enqueueWebsiteSync("asset", item.sku);
  }
  revalidatePath("/masters/media");
  revalidatePath(`/masters/items/${row.itemId}`);
}
