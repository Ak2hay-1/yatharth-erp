import fs from "fs";
import path from "path";
import { getDataDir } from "@/lib/data-dir";
import { DEFAULT_SYNC_CONFIG, type SyncConfig } from "@/lib/sync/types";

const SYNC_FILE = "sync.json";

function syncPath(): string {
  return path.join(getDataDir(), SYNC_FILE);
}

export function readSyncConfig(): SyncConfig {
  try {
    const raw = fs.readFileSync(syncPath(), "utf8");
    return { ...DEFAULT_SYNC_CONFIG, ...JSON.parse(raw) } as SyncConfig;
  } catch {
    return { ...DEFAULT_SYNC_CONFIG };
  }
}

export function writeSyncConfig(patch: Partial<SyncConfig>): SyncConfig {
  const next = { ...readSyncConfig(), ...patch };
  fs.mkdirSync(getDataDir(), { recursive: true });
  fs.writeFileSync(syncPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function isSyncConfigured(config = readSyncConfig()): boolean {
  return config.enabled && Boolean(config.apiUrl.trim()) && Boolean(config.syncSecret.trim());
}
