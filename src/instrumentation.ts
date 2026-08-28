export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.VERCEL) return;

  const { startWebsiteSyncScheduler } = await import("@/lib/website-sync-scheduler");
  startWebsiteSyncScheduler();
}
