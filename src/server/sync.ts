"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchSyncStatus } from "@/lib/sync/client";
import { isSyncConfigured, readSyncConfig, writeSyncConfig } from "@/lib/sync/config";
import { enqueueCompanySync, enqueueFullSync, enqueueProductSync, enqueueAssetSync } from "@/lib/sync/queue";
import { publishAllToWebsite, runQueuedSync, runSyncJob } from "@/lib/sync/runner";
import { requireRole } from "@/lib/session";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";

export async function saveSyncSettings(formData: FormData) {
  await requireRole(SUPER_ADMIN_ONLY);
  writeSyncConfig({
    enabled: formData.get("enabled") === "on",
    apiUrl: String(formData.get("apiUrl") ?? "").trim(),
    syncSecret: String(formData.get("syncSecret") ?? "").trim(),
  });
  revalidatePath("/settings");
  redirect("/settings?saved=sync");
}

export async function testSyncConnection() {
  await requireRole(SUPER_ADMIN_ONLY);
  const config = readSyncConfig();
  if (!isSyncConfigured(config)) {
    return { ok: false, error: "Enter API URL and sync secret, and enable sync." };
  }
  try {
    const status = await fetchSyncStatus(config.apiUrl, config.syncSecret);
    return { ok: true, status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function publishWebsiteNow() {
  await requireRole(SUPER_ADMIN_ONLY);
  const result = await publishAllToWebsite();
  revalidatePath("/settings");
  return result;
}

export async function flushSyncQueue() {
  const config = readSyncConfig();
  if (!isSyncConfigured(config)) return { ok: false, skipped: true };
  return runQueuedSync();
}

export async function triggerProductSync(sku: string) {
  enqueueProductSync(sku);
}

export async function triggerCompanySync() {
  enqueueCompanySync();
}

export async function triggerAssetSync(sku: string) {
  enqueueAssetSync(sku);
}

export async function triggerFullSyncEnqueue() {
  enqueueFullSync();
}

export async function getSyncSettingsForPanel() {
  await requireRole(SUPER_ADMIN_ONLY);
  return readSyncConfig();
}
