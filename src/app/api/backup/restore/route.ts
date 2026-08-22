import { copyFile, mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";
import {
  backupFilename,
  getBackupsDir,
  getDatabaseFilePath,
  getSqliteSidecarPaths,
  toSqliteFileUrl,
} from "@/lib/db-path";
import { disconnectPrisma, resetPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SQLITE_MAGIC = Buffer.from("SQLite format 3\0");

async function removeIfExists(filePath: string) {
  try {
    await unlink(filePath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
}

async function removeSidecars(dbPath: string) {
  const { wal, shm, journal } = getSqliteSidecarPaths(dbPath);
  await Promise.all([removeIfExists(wal), removeIfExists(shm), removeIfExists(journal)]);
}

/**
 * Validate on a *copy* of the upload. Opening SQLite/Prisma can create WAL sidecars
 * or touch the file; the pristine upload bytes must be what we install.
 */
async function validateSqliteBackup(pristinePath: string): Promise<void> {
  const fh = await readFile(pristinePath);
  if (fh.length < 100) {
    throw new Error("File is too small to be a valid SQLite database.");
  }
  if (!fh.subarray(0, 16).equals(SQLITE_MAGIC)) {
    throw new Error("File is not a valid SQLite database.");
  }

  const probePath = `${pristinePath}.probe`;
  await copyFile(pristinePath, probePath);
  await removeSidecars(probePath);

  const probe = new PrismaClient({
    datasources: { db: { url: toSqliteFileUrl(probePath) } },
  });
  try {
    const users = await probe.user.count();
    const companies = await probe.company.count();
    if (users < 1) {
      throw new Error("Backup has no users — cannot sign in after restore.");
    }
    if (companies < 1) {
      throw new Error("Backup is missing company data.");
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Backup ")) throw err;
    throw new Error("Backup is missing required Yatharth tables (User / Company).");
  } finally {
    try {
      await probe.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
    } catch {
      // ignore
    }
    await probe.$disconnect().catch(() => undefined);
    await removeSidecars(probePath);
    await removeIfExists(probePath);
  }
}

async function copyWithRetries(from: string, to: string, attempts = 8) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await copyFile(from, to);
      return;
    } catch (err) {
      lastErr = err;
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EBUSY" && code !== "EPERM" && code !== "EACCES") throw err;
      await new Promise((r) => setTimeout(r, 100 * (i + 1)));
      await disconnectPrisma();
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Could not replace database file (file locked).");
}

export async function POST(request: Request) {
  await requireRole(SUPER_ADMIN_ONLY);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No backup file uploaded." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) {
    return Response.json({ error: "Uploaded file is empty." }, { status: 400 });
  }

  const livePath = getDatabaseFilePath();
  const prismaDir = path.dirname(livePath);
  const tempPath = path.join(prismaDir, `restore-upload-${Date.now()}.db`);
  const backupsDir = getBackupsDir();
  let safetyPath: string | null = null;

  try {
    // Keep pristine upload bytes on disk; never open this path with Prisma.
    await writeFile(tempPath, bytes);
    await validateSqliteBackup(tempPath);

    // Re-write pristine bytes in case anything else touched the path.
    await writeFile(tempPath, bytes);
    await removeSidecars(tempPath);

    await mkdir(backupsDir, { recursive: true });
    safetyPath = path.join(backupsDir, backupFilename("pre-restore"));

    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
    } catch {
      // continue
    }

    await copyFile(livePath, safetyPath);

    await disconnectPrisma();
    await removeSidecars(livePath);

    try {
      await copyWithRetries(tempPath, livePath);
      await removeIfExists(tempPath);
    } catch (err) {
      if (safetyPath) {
        try {
          await copyWithRetries(safetyPath, livePath);
          await removeSidecars(livePath);
        } catch {
          // leave safety copy for manual recovery
        }
      }
      await removeIfExists(tempPath);
      throw err;
    }

    await removeSidecars(livePath);

    const client = await resetPrisma();
    const userCount = await client.user.count();
    await client.company.count();
    if (userCount < 1) {
      throw new Error("Restore installed a database with no users.");
    }

    // Drop the connection so the next request (login) opens a clean handle.
    await disconnectPrisma();

    return Response.json({
      ok: true,
      message: "Restore completed. Sign in with an account from that backup.",
      safetyBackup: path.basename(safetyPath),
      userCount,
    });
  } catch (err) {
    await removeIfExists(tempPath);
    await removeSidecars(tempPath);
    const message = err instanceof Error ? err.message : "Restore failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
