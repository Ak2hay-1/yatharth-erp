"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";
import {
  fetchWebsiteInquiries,
  fetchWebsiteSyncStatus,
  flushWebsiteSyncQueue,
  normalizeApiUrl,
  publishWebsiteCatalog,
  readWebsiteSyncSettings,
  writeWebsiteSyncSettings,
  type WebsiteSyncSettings,
} from "@/lib/website-sync";

function settingsFromForm(formData: FormData, previous: WebsiteSyncSettings): WebsiteSyncSettings {
  const enabled = formData.get("enabled") === "on" || formData.get("enabled") === "true";
  const apiUrl = normalizeApiUrl(String(formData.get("apiUrl") ?? previous.apiUrl));
  const syncSecret = String(formData.get("syncSecret") ?? previous.syncSecret).trim();
  if (enabled && !syncSecret) {
    throw new Error("Sync secret is required when website sync is enabled.");
  }
  return {
    ...previous,
    enabled,
    apiUrl,
    syncSecret,
  };
}

export async function saveWebsiteSync(formData: FormData) {
  await requireRole(SUPER_ADMIN_ONLY);
  const intent = String(formData.get("intent") ?? "save");
  const previous = await readWebsiteSyncSettings();
  const next = settingsFromForm(formData, previous);
  await writeWebsiteSyncSettings({ ...next, lastError: intent === "save" ? "" : next.lastError });

  if (intent === "publish") {
    await publishWebsiteCatalog();
    revalidatePath("/settings");
    redirect("/settings?saved=sync-publish");
  }

  if (intent === "flush") {
    await flushWebsiteSyncQueue("manual");
    revalidatePath("/settings");
    redirect("/settings?saved=sync-flush");
  }

  revalidatePath("/settings");
  redirect("/settings?saved=sync");
}

export async function getWebsiteInquiriesAction() {
  await requireRole(SUPER_ADMIN_ONLY);
  return fetchWebsiteInquiries(40);
}

export async function getWebsiteSyncRemoteStatusAction() {
  await requireRole(SUPER_ADMIN_ONLY);
  return fetchWebsiteSyncStatus();
}
