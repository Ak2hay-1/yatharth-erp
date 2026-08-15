"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";
import {
  parseBackupInterval,
  parseBackupTime,
  performAutoBackup,
  readAutoBackupSettings,
  resolveBackupFolder,
  writeAutoBackupSettings,
  type AutoBackupSettings,
} from "@/lib/auto-backup";

function settingsFromForm(formData: FormData, previous: AutoBackupSettings): AutoBackupSettings {
  const enabled = formData.get("enabled") === "on" || formData.get("enabled") === "true";
  const pathRaw = String(formData.get("path") ?? "").trim();
  const time = parseBackupTime(String(formData.get("time") ?? previous.time));
  const interval = parseBackupInterval(formData.get("intervalValue"), formData.get("intervalUnit"));
  return {
    ...previous,
    enabled,
    path: pathRaw,
    time,
    intervalValue: interval.intervalValue,
    intervalUnit: interval.intervalUnit,
  };
}

export async function saveAutoBackup(formData: FormData) {
  await requireRole(SUPER_ADMIN_ONLY);
  const runNow = String(formData.get("intent") ?? "") === "run";
  const previous = await readAutoBackupSettings();
  const next = settingsFromForm(formData, previous);

  if (next.enabled || runNow) {
    resolveBackupFolder(next.path);
  }

  await writeAutoBackupSettings({ ...next, lastError: "" });

  if (runNow) {
    await performAutoBackup("manual");
    revalidatePath("/settings");
    redirect("/settings?saved=backup-run");
  }

  revalidatePath("/settings");
  redirect("/settings?saved=backup");
}
