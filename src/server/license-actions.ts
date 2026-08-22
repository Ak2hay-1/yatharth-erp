"use server";

import { redirect } from "next/navigation";
import { activateLicense, isLicenseEnforced } from "@/lib/license";

export async function activateLicenseAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  if (!isLicenseEnforced()) {
    redirect("/login");
  }
  const result = activateLicense(String(formData.get("key") ?? ""));
  if (!result.ok) return { error: result.error };
  redirect("/login");
}
