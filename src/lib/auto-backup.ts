import { copyFile, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getDataDir } from "@/lib/data-dir";
import { backupFilename, getDatabaseFilePath } from "@/lib/db-path";
import {
  AUTO_BACKUP_TIME_RE,
  DEFAULT_AUTO_BACKUP,
  isAutoBackupDue,
  parseBackupInterval,
  type AutoBackupSettings,
} from "@/lib/auto-backup-config";

export {
  DEFAULT_AUTO_BACKUP,
  describeInterval,
  isAutoBackupDue,
  nextAutoBackupDue,
  parseBackupInterval,
  parseBackupTime,
  type AutoBackupIntervalUnit,
  type AutoBackupSettings,
} from "@/lib/auto-backup-config";

const SETTINGS_FILE = "auto-backup.json";

function settingsPath() {
  return path.join(getDataDir(), SETTINGS_FILE);
}

export async function readAutoBackupSettings(): Promise<AutoBackupSettings> {
  try {
    const raw = await readFile(settingsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<AutoBackupSettings>;
    const merged: AutoBackupSettings = {
      ...DEFAULT_AUTO_BACKUP,
      ...parsed,
      enabled: Boolean(parsed.enabled),
      path: String(parsed.path ?? ""),
      time: AUTO_BACKUP_TIME_RE.test(String(parsed.time ?? "").slice(0, 5))
        ? String(parsed.time).slice(0, 5)
        : DEFAULT_AUTO_BACKUP.time,
      lastAt: parsed.lastAt ? String(parsed.lastAt) : null,
      lastFile: String(parsed.lastFile ?? ""),
      lastError: String(parsed.lastError ?? ""),
    };
    try {
      const interval = parseBackupInterval(
        parsed.intervalValue ?? DEFAULT_AUTO_BACKUP.intervalValue,
        parsed.intervalUnit ?? "days",
      );
      merged.intervalValue = interval.intervalValue;
      merged.intervalUnit = interval.intervalUnit;
    } catch {
      merged.intervalValue = DEFAULT_AUTO_BACKUP.intervalValue;
      merged.intervalUnit = DEFAULT_AUTO_BACKUP.intervalUnit;
    }
    return merged;
  } catch {
    return { ...DEFAULT_AUTO_BACKUP };
  }
}

export async function writeAutoBackupSettings(settings: AutoBackupSettings) {
  const dest = settingsPath();
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export function resolveBackupFolder(rawPath: string) {
  const trimmed = rawPath.trim();
  if (!trimmed) throw new Error("Choose a backup folder.");
  if (!path.isAbsolute(trimmed)) {
    throw new Error("Backup folder must be a full path, for example D:\\Yatharth Backups.");
  }
  const resolved = path.resolve(trimmed);
  const live = path.resolve(getDatabaseFilePath());
  if (resolved === live) {
    throw new Error("Backup folder cannot be the live database file.");
  }
  return resolved;
}

let queue: Promise<unknown> = Promise.resolve();

function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function copyLiveDatabaseTo(destFile: string) {
  const live = getDatabaseFilePath();
  await mkdir(path.dirname(destFile), { recursive: true });
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch {
    // Copy the main file even if checkpoint is unavailable.
  }
  await copyFile(live, destFile);
}

export async function performAutoBackup(reason: "scheduled" | "manual") {
  return exclusive(async () => {
    const settings = await readAutoBackupSettings();
    if (reason === "scheduled" && (!settings.enabled || !isAutoBackupDue(settings))) {
      return { ok: false as const, skipped: true as const, message: "Auto backup is not due." };
    }

    try {
      const folder = resolveBackupFolder(settings.path);
      await mkdir(folder, { recursive: true });
      const destFile = path.join(folder, backupFilename());
      await copyLiveDatabaseTo(destFile);

      const next: AutoBackupSettings = {
        ...settings,
        lastAt: new Date().toISOString(),
        lastFile: destFile,
        lastError: "",
      };
      await writeAutoBackupSettings(next);
      return { ok: true as const, skipped: false as const, file: destFile, settings: next };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Auto backup failed.";
      await writeAutoBackupSettings({ ...settings, lastError: message });
      if (reason === "manual") throw new Error(message);
      return { ok: false as const, skipped: false as const, message, settings };
    }
  });
}
