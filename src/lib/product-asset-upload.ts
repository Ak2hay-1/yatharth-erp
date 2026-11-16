import { friendlyUploadError, productImageError, productImageExtension } from "@/lib/product-image";

export type ProductAssetUploadFields = {
  itemId: string;
  file: File;
  kind?: string;
  title?: string;
  notes?: string;
};

function networkUploadError(err: unknown, step: string) {
  const message = err instanceof Error ? err.message : String(err);
  if (/Failed to fetch|NetworkError|Load failed|CORS/i.test(message)) {
    if (step === "r2-direct") {
      return "Browser blocked direct R2 upload (missing bucket CORS). Falling back to server upload…";
    }
    return `Network error during ${step}. Hard-refresh after the latest deploy and retry.`;
  }
  return message || "Upload failed.";
}

/**
 * Prefer direct R2 (needs bucket CORS). If blocked, upload the file through the ERP
 * as one R2 multipart part (file max 4MB; last part may be smaller than 5MB).
 * Avoids Cloudflare HTML 502s that often hit multipart/form-data.
 */
export async function uploadProductAssetDirect(fields: ProductAssetUploadFields) {
  const invalid = productImageError(fields.file);
  if (invalid) throw new Error(invalid);
  if (!fields.itemId.trim()) throw new Error("Choose a product.");

  const mimeType = fields.file.type || "application/octet-stream";
  const fileName = fields.file.name || `upload${productImageExtension(fields.file.name) || ".bin"}`;

  const usedDirect = await tryDirectR2Upload(fields, fileName, mimeType);
  if (usedDirect) return;

  await uploadProductAssetViaMultipart(fields, fileName, mimeType);
}

async function tryDirectR2Upload(
  fields: ProductAssetUploadFields,
  fileName: string,
  mimeType: string,
): Promise<boolean> {
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
      }),
    });
  } catch {
    return false;
  }
  if (!presignRes.ok) return false;

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
  } catch {
    return false;
  }
  if (!putRes.ok) return false;

  const completeRes = await fetch("/api/product-assets/complete", {
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
  if (!completeRes.ok) {
    throw new Error(friendlyUploadError(completeRes.status, await completeRes.text()));
  }
  return true;
}

async function uploadProductAssetViaMultipart(
  fields: ProductAssetUploadFields,
  fileName: string,
  mimeType: string,
) {
  let startRes: Response;
  try {
    startRes = await fetch("/api/product-assets/multipart/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: fields.itemId,
        fileName,
        mimeType,
        sizeBytes: fields.file.size,
        kind: fields.kind || "PACK_SHOT",
      }),
    });
  } catch (err) {
    throw new Error(networkUploadError(err, "multipart-start"));
  }
  if (!startRes.ok) {
    throw new Error(friendlyUploadError(startRes.status, await startRes.text()));
  }

  const started = (await startRes.json()) as { uploadId: string; objectKey: string };

  let partRes: Response;
  try {
    partRes = await fetch("/api/product-assets/multipart/part", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-r2-key": started.objectKey,
        "x-r2-upload-id": started.uploadId,
        "x-r2-part-number": "1",
      },
      body: fields.file,
    });
  } catch (err) {
    throw new Error(networkUploadError(err, "multipart-part"));
  }
  if (!partRes.ok) {
    throw new Error(friendlyUploadError(partRes.status, await partRes.text()));
  }
  const part = (await partRes.json()) as { etag: string; partNumber: number };

  let completeRes: Response;
  try {
    completeRes = await fetch("/api/product-assets/multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: fields.itemId,
        objectKey: started.objectKey,
        uploadId: started.uploadId,
        fileName,
        mimeType,
        sizeBytes: fields.file.size,
        kind: fields.kind || "PACK_SHOT",
        title: fields.title || "",
        notes: fields.notes || "",
        parts: [{ partNumber: part.partNumber, etag: part.etag }],
      }),
    });
  } catch (err) {
    throw new Error(networkUploadError(err, "multipart-complete"));
  }
  if (!completeRes.ok) {
    throw new Error(friendlyUploadError(completeRes.status, await completeRes.text()));
  }
}
