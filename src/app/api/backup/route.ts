import { readFile } from "fs/promises";
import { requireRole } from "@/lib/session";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";
import { backupFilename, getDatabaseFilePath } from "@/lib/db-path";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole(SUPER_ADMIN_ONLY);

  // Best-effort WAL checkpoint so the on-disk file is consistent for download.
  try {
    await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch {
    // Ignore — download still proceeds from the main DB file.
  }

  const file = getDatabaseFilePath();
  const buf = await readFile(file);
  const name = backupFilename();

  return new Response(buf, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
