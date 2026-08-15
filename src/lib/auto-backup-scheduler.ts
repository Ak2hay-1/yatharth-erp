import {
  isAutoBackupDue,
  performAutoBackup,
  readAutoBackupSettings,
} from "@/lib/auto-backup";

const TICK_MS = 60_000;
const START_DELAY_MS = 8_000;

const globalForBackup = globalThis as unknown as {
  yatharthAutoBackupTimer?: ReturnType<typeof setInterval>;
  yatharthAutoBackupStarted?: boolean;
};

async function tick() {
  try {
    const settings = await readAutoBackupSettings();
    if (!settings.enabled || !settings.path.trim()) return;
    if (!isAutoBackupDue(settings)) return;
    await performAutoBackup("scheduled");
  } catch {
    // Next tick retries; lastError is stored by performAutoBackup when possible.
  }
}

export function startAutoBackupScheduler() {
  if (globalForBackup.yatharthAutoBackupStarted) return;
  globalForBackup.yatharthAutoBackupStarted = true;

  setTimeout(() => {
    void tick();
    if (globalForBackup.yatharthAutoBackupTimer) {
      clearInterval(globalForBackup.yatharthAutoBackupTimer);
    }
    globalForBackup.yatharthAutoBackupTimer = setInterval(() => {
      void tick();
    }, TICK_MS);
    globalForBackup.yatharthAutoBackupTimer.unref?.();
  }, START_DELAY_MS);
}
