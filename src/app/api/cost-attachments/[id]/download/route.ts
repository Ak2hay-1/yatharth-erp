import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FINANCE } from "@/lib/permissions";
import { readDocumentBytes } from "@/lib/document-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireRole(FINANCE);
  const { id } = await context.params;
  const row = await prisma.itemCostAttachment.findUnique({ where: { id } });
  if (!row) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readDocumentBytes(row.storageKey);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": row.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${row.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
