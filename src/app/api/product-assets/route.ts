import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import type { ProductAssetKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { can, OPS } from "@/lib/permissions";
import { sanitizeFileName } from "@/lib/document-storage";
import { productImageError, productImageExtension } from "@/lib/product-image";
import { deleteR2Object, putR2Object, r2Configured, toR2StorageKey } from "@/lib/r2";
import { enqueueWebsiteSync } from "@/lib/website-sync";

export const runtime = "nodejs";

const KINDS = new Set<ProductAssetKind>(["PACK_SHOT", "LABEL_ART", "PROCESS", "OTHER"]);

function kindOf(value: FormDataEntryValue | null): ProductAssetKind {
  const kind = String(value || "OTHER");
  return KINDS.has(kind as ProductAssetKind) ? (kind as ProductAssetKind) : "OTHER";
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Sign in to upload.", { status: 401 });
  if (!can(user.role, OPS)) return new Response("You cannot upload product images.", { status: 403 });
  if (!r2Configured()) return new Response("Image storage is not configured.", { status: 503 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("Could not read the upload.", { status: 400 });
  }

  const itemId = String(form.get("itemId") ?? "").trim();
  if (!itemId) return new Response("Choose a product.", { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return new Response("Choose an image or file.", { status: 400 });
  const invalid = productImageError(file);
  if (invalid) return new Response(invalid, { status: 400 });

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, sku: true, type: true },
  });
  if (!item) return new Response("Choose a product.", { status: 400 });

  const ext = productImageExtension(file.name) || ".bin";
  const objectKey = `product-assets/${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";

  try {
    await putR2Object(objectKey, bytes, mimeType);
  } catch (err) {
    if (err instanceof Error && err.message === "Image storage is not configured.") {
      return new Response(err.message, { status: 503 });
    }
    return new Response("Could not store the image.", { status: 502 });
  }

  try {
    await prisma.productAsset.create({
      data: {
        itemId,
        kind: kindOf(form.get("kind")),
        title: String(form.get("title") ?? "").trim(),
        notes: String(form.get("notes") ?? "").trim(),
        fileName: sanitizeFileName(file.name),
        mimeType,
        sizeBytes: bytes.length,
        storageKey: toR2StorageKey(objectKey),
      },
    });
  } catch {
    await deleteR2Object(objectKey).catch(() => undefined);
    return new Response("Could not save the image.", { status: 500 });
  }

  if (item.type === "FINISHED") {
    void enqueueWebsiteSync("products");
    void enqueueWebsiteSync("asset", item.sku);
  }
  revalidatePath("/masters/media");
  revalidatePath(`/masters/items/${itemId}`);
  return new Response(null, { status: 204 });
}
