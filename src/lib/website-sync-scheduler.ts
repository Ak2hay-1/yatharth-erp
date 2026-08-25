import {
  flushWebsiteSyncQueue,
  publishWebsiteCatalog,
  readWebsiteSyncSettings,
} from "@/lib/website-sync";

const TICK_MS = 120_000;
const START_DELAY_MS = 15_000;

const globalForSync = globalThis as unknown as {
  yatharthWebsiteSyncTimer?: ReturnType<typeof setInterval>;
  yatharthWebsiteSyncStarted?: boolean;
};

async function tick() {
  try {
    const settings = await readWebsiteSyncSettings();
    if (!settings.enabled) return;
    await flushWebsiteSyncQueue("scheduled");
  } catch {
    // lastError stored by flush when possible
  }
}

export function startWebsiteSyncScheduler() {
  if (globalForSync.yatharthWebsiteSyncStarted) return;
  globalForSync.yatharthWebsiteSyncStarted = true;

  setTimeout(() => {
    void tick();
    if (globalForSync.yatharthWebsiteSyncTimer) {
      clearInterval(globalForSync.yatharthWebsiteSyncTimer);
    }
    globalForSync.yatharthWebsiteSyncTimer = setInterval(() => {
      void tick();
    }, TICK_MS);
    globalForSync.yatharthWebsiteSyncTimer.unref?.();
  }, START_DELAY_MS);
}
