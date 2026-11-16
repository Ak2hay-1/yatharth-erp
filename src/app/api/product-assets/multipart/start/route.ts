import { randomBytes } from "crypto";
import type { ProductAssetKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { can, OPS } from "@/lib/permissions";
import { productImageError, productImageExtension } from "@/lib/product-image";
import { r2Configured, startR2MultipartUpload } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 30;

const KINDS = new Set<ProductAssetKind>(["PACK_SHOT", "LABEL_ART", "PROCESS", "OTHER"]);

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Sign in to upload.", { status: 401 });
  if (!can(user.role, OPS)) return new Response("You cannot upload product images.", { status: 403 });
  if (!r2Configured()) return new Response("Image storage is not configured.", { status: 503 });

  let body: {
    itemId?: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    kind?: string;
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

  const kind = String(body.kind || "PACK_SHOT");
  if (!KINDS.has(kind as ProductAssetKind)) return new Response("Invalid asset kind.", { status: 400 });

  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
  if (!item) return new Response("Choose a product.", { status: 400 });

  const mimeType = String(body.mimeType || "application/octet-stream");
  const ext = productImageExtension(fileName) || ".bin";
  const objectKey = `product-assets/${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;

  try {
    const started = await startR2MultipartUpload(objectKey, mimeType);
    return Response.json(started);
  } catch (err) {
    console.error("[product-assets/multipart/start]", err);
    const message = err instanceof Error ? err.message : "Could not start upload.";
    return new Response(message, { status: 502 });
  }
}
