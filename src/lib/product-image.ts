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
