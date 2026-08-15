import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OPS } from "@/lib/permissions";
import { resolveDocumentPath } from "@/lib/document-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireRole(OPS);
  const { id } = await context.params;
  const row = await prisma.plantDocument.findUnique({ where: { id } });
  if (!row) {
    return new Response("Not found", { status: 404 });
  }
  if (!row.storageKey) {
    return new Response("No file attached", { status: 404 });
  }

  try {
    const bytes = await readFile(resolveDocumentPath(row.storageKey));
    return new Response(bytes, {
      headers: {
        "Content-Type": row.mimeType || "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename="${row.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("File missing on disk", { status: 404 });
  }
}
