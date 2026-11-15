import { revalidatePath } from "next/cache";
import type { ProductAssetKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { can, OPS } from "@/lib/permissions";
import { sanitizeFileName } from "@/lib/document-storage";
import { productImageError } from "@/lib/product-image";
import { isR2StorageKey, r2Configured, toR2StorageKey } from "@/lib/r2";
import { enqueueWebsiteSync } from "@/lib/website-sync";

export const runtime = "nodejs";

const KINDS = new Set<ProductAssetKind>(["PACK_SHOT", "LABEL_ART", "PROCESS", "OTHER"]);

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Sign in to upload.", { status: 401 });
  if (!can(user.role, OPS)) return new Response("You cannot upload product images.", { status: 403 });
  if (!r2Configured()) return new Response("Image storage is not configured.", { status: 503 });

  let body: {
    itemId?: string;
    objectKey?: string;
    storageKey?: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    kind?: string;
    title?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  const itemId = String(body.itemId ?? "").trim();
  if (!itemId) return new Response("Choose a product.", { status: 400 });

  const fileName = String(body.fileName ?? "").trim() || "upload.bin";
  const sizeBytes = Number(body.sizeBytes ?? 0);
  const invalid = productImageError({ name: fileName, size: sizeBytes });
  if (invalid) return new Response(invalid, { status: 400 });

  const objectKey = String(body.objectKey ?? "").trim();
  if (!objectKey.startsWith("product-assets/")) {
    return new Response("Invalid storage key.", { status: 400 });
  }

  const storageKeyRaw = String(body.storageKey ?? "").trim();
  const storageKey = storageKeyRaw
    ? isR2StorageKey(storageKeyRaw)
      ? storageKeyRaw
      : toR2StorageKey(objectKey)
    : toR2StorageKey(objectKey);
  if (!storageKey.endsWith(objectKey)) {
    return new Response("Invalid storage key.", { status: 400 });
  }

  const kind = String(body.kind || "PACK_SHOT");
  if (!KINDS.has(kind as ProductAssetKind)) {
    return new Response("Invalid asset kind.", { status: 400 });
  }

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, sku: true, type: true },
  });
  if (!item) return new Response("Choose a product.", { status: 400 });

  try {
    await prisma.productAsset.create({
      data: {
        itemId,
        kind: kind as ProductAssetKind,
        title: String(body.title ?? "").trim(),
        notes: String(body.notes ?? "").trim(),
        fileName: sanitizeFileName(fileName),
        mimeType: String(body.mimeType || "application/octet-stream"),
        sizeBytes,
        storageKey,
      },
    });
  } catch (err) {
    console.error("[product-assets/complete]", err);
    return new Response("Could not save the image.", { status: 500 });
  }

  if (item.type === "FINISHED") {
    void enqueueWebsiteSync("products");
    void enqueueWebsiteSync("asset", item.sku);
  }
  revalidatePath("/masters/media");
  revalidatePath("/masters/website-catalog");
  revalidatePath(`/masters/website-catalog/${itemId}`);
  revalidatePath(`/masters/items/${itemId}`);
  return new Response(null, { status: 204 });
}
