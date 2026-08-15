import path from "path";
import { getDataDir } from "@/lib/data-dir";

/**
 * Resolve the absolute SQLite file path from DATABASE_URL.
 * Relative `file:` URLs are resolved against the Prisma schema directory (`prisma/`)
 * under the data dir when packaged, otherwise under cwd.
 */
export function getDatabaseFilePath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!url.startsWith("file:")) {
    throw new Error("Backup/restore only supports SQLite file: DATABASE_URL");
  }

  let filePath = url.slice("file:".length);

  // file:///C:/... or file:///home/...
  if (filePath.startsWith("///")) {
    filePath = filePath.slice(2); // keep leading /
    if (process.platform === "win32" && /^\/[A-Za-z]:/.test(filePath)) {
      filePath = filePath.slice(1);
    }
  } else if (filePath.startsWith("//")) {
    // file://localhost/path — uncommon; treat remainder as path
    filePath = filePath.replace(/^\/\/[^/]*/, "") || filePath;
  }

  if (path.isAbsolute(filePath)) {
    return path.normalize(filePath);
  }

  return path.resolve(getDataDir(), "prisma", filePath);
}

export function getSqliteSidecarPaths(dbPath: string) {
  return {
    wal: `${dbPath}-wal`,
    shm: `${dbPath}-shm`,
    journal: `${dbPath}-journal`,
  };
}

export function getBackupsDir(): string {
  return path.join(getDataDir(), "backups");
}

export function backupFilename(prefix = "yatharth-backup"): string {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${prefix}-${stamp}.db`;
}

/** Prisma `file:` URL for an absolute filesystem path (Windows-safe). */
export function toSqliteFileUrl(absolutePath: string): string {
  return `file:${path.resolve(absolutePath).replace(/\\/g, "/")}`;
}
