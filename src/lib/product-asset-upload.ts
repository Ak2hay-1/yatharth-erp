import { friendlyUploadError, productImageError, productImageExtension } from "@/lib/product-image";

export type ProductAssetUploadFields = {
  itemId: string;
  file: File;
  kind?: string;
  title?: string;
  notes?: string;
};

/**
 * Direct-to-R2 upload: small JSON to ERP → PUT file to R2 → complete record in ERP.
 * Avoids sending the image body through Cloudflare → Vercel (common 502 source).
 */
function networkUploadError(err: unknown, step: "presign" | "r2" | "complete") {
  const message = err instanceof Error ? err.message : String(err);
  if (/Failed to fetch|NetworkError|Load failed|CORS/i.test(message)) {
    if (step === "r2") {
      return "Browser blocked the direct R2 upload (usually missing bucket CORS). In Cloudflare R2 → yatharth-foods → Settings → CORS, allow PUT from https://erp.yatharthafoods.in, then retry.";
    }
    return `Network error during ${step}. Check you are online, then retry. If it keeps failing, hard-refresh after the latest ERP deploy.`;
  }
  return message || "Upload failed.";
}

export async function uploadProductAssetDirect(fields: ProductAssetUploadFields) {
  const invalid = productImageError(fields.file);
  if (invalid) throw new Error(invalid);
  if (!fields.itemId.trim()) throw new Error("Choose a product.");

  const mimeType = fields.file.type || "application/octet-stream";
  const fileName = fields.file.name || `upload${productImageExtension(fields.file.name) || ".bin"}`;

  let presignRes: Response;
  try {
    presignRes = await fetch("/api/product-assets/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: fields.itemId,
        fileName,
        mimeType,
        sizeBytes: fields.file.size,
        kind: fields.kind || "PACK_SHOT",
        title: fields.title || "",
        notes: fields.notes || "",
      }),
    });
  } catch (err) {
    throw new Error(networkUploadError(err, "presign"));
  }
  if (!presignRes.ok) {
    throw new Error(friendlyUploadError(presignRes.status, await presignRes.text()));
  }
  const presign = (await presignRes.json()) as {
    uploadUrl: string;
    objectKey: string;
    storageKey: string;
  };

  let putRes: Response;
  try {
    putRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: fields.file,
    });
  } catch (err) {
    throw new Error(networkUploadError(err, "r2"));
  }
  if (!putRes.ok) {
    const detail = (await putRes.text().catch(() => "")).trim();
    if (/AccessDenied|Access Denied|Forbidden/i.test(detail) || putRes.status === 403) {
      throw new Error(
        "R2 rejected the upload (403). Check Object Read & Write on the API token, and add CORS on the R2 bucket allowing PUT from the ERP origin.",
      );
    }
    throw new Error(detail.slice(0, 280) || `Direct storage upload failed (${putRes.status}).`);
  }

  let completeRes: Response;
  try {
    completeRes = await fetch("/api/product-assets/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: fields.itemId,
        objectKey: presign.objectKey,
        storageKey: presign.storageKey,
        fileName,
        mimeType,
        sizeBytes: fields.file.size,
        kind: fields.kind || "PACK_SHOT",
        title: fields.title || "",
        notes: fields.notes || "",
      }),
    });
  } catch (err) {
    throw new Error(networkUploadError(err, "complete"));
  }
  if (!completeRes.ok) {
    throw new Error(friendlyUploadError(completeRes.status, await completeRes.text()));
  }
}
