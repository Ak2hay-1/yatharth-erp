import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { getDataDir } from "@/lib/data-dir";

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const ALLOWED_EXT = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
]);

export function getDocumentsRoot() {
  return path.resolve(getDataDir(), "uploads", "documents");
}

export function resolveDocumentPath(storageKey: string) {
  const root = getDocumentsRoot();
  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error("Invalid document path.");
  }
  return resolved;
}

export function sanitizeFileName(name: string) {
  const base = path.basename(name).replace(/[^\w.\- ()[\]]+/g, "_").trim();
  return base.slice(0, 180) || "document";
}

export function extensionOf(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

export function assertAllowedDocument(file: File) {
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error("Choose a file to upload.");
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("File is larger than 25 MB.");
  }
  const ext = extensionOf(file.name);
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Allowed types: PDF, images, Word, Excel, PowerPoint, TXT, CSV.");
  }
}

export async function saveDocumentFile(file: File): Promise<{
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}> {
  assertAllowedDocument(file);
  const fileName = sanitizeFileName(file.name);
  const ext = extensionOf(fileName) || ".bin";
  const storageKey = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const dir = getDocumentsRoot();
  await mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(resolveDocumentPath(storageKey), bytes);
  return {
    storageKey,
    fileName,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: bytes.length,
  };
}

export async function removeDocumentFile(storageKey: string) {
  try {
    await unlink(resolveDocumentPath(storageKey));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
