export const MAX_PRODUCT_IMAGE_BYTES = 4 * 1024 * 1024;

const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf"]);

export function productImageExtension(fileName: string) {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? fileName;
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot).toLowerCase() : "";
}

/** Returns a message the upload form can show, or null when the file is acceptable. */
export function productImageError(file: { name: string; size: number }): string | null {
  if (file.size <= 0) return "Choose an image or file.";
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) return "Image must be 4 MB or smaller.";
  if (!ALLOWED_EXT.has(productImageExtension(file.name))) {
    return "Allowed types: PNG, JPG, WEBP, GIF, PDF.";
  }
  return null;
}

/** Turn Cloudflare HTML / gateway bodies into a short UI message. */
export function friendlyUploadError(status: number, body: string) {
  const text = body.replace(/\s+/g, " ").trim();
  if (/<!DOCTYPE html>|cf-error-details|Bad gateway|cloudflare-nginx/i.test(body)) {
    return "Upload hit a Cloudflare gateway error. Configure R2 bucket CORS for the ERP origin, then retry (direct-to-R2 upload). If it persists, set the erp DNS record to DNS-only (grey cloud).";
  }
  if (status === 413) return "Image is too large for the server. Use a file under 4 MB.";
  return text.slice(0, 280) || "Upload failed.";
}
