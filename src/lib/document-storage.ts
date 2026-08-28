import { mkdir, unlink, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { del, put } from "@vercel/blob";
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

function useBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

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
  const bytes = Buffer.from(await file.arrayBuffer());

  if (useBlobStorage()) {
    const blob = await put(`documents/${storageKey}`, bytes, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });
    return {
      storageKey: blob.url,
      fileName,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: bytes.length,
    };
  }

  const dir = getDocumentsRoot();
  await mkdir(dir, { recursive: true });
  await writeFile(resolveDocumentPath(storageKey), bytes);
  return {
    storageKey,
    fileName,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: bytes.length,
  };
}

export async function removeDocumentFile(storageKey: string) {
  if (!storageKey) return;

  if (useBlobStorage() && storageKey.startsWith("http")) {
    await del(storageKey);
    return;
  }

  try {
    await unlink(resolveDocumentPath(storageKey));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
}

export async function readDocumentBytes(storageKey: string): Promise<Buffer> {
  if (!storageKey) throw new Error("Missing storage key.");

  if (useBlobStorage() && storageKey.startsWith("http")) {
    const res = await fetch(storageKey);
    if (!res.ok) throw new Error("File missing in blob storage.");
    return Buffer.from(await res.arrayBuffer());
  }

  return readFile(resolveDocumentPath(storageKey));
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
