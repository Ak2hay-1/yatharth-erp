import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLicenseStatus, isLicenseEnforced } from "@/lib/license";
import { ActivateForm } from "./activate-form";

export const metadata: Metadata = {
  title: "Install — YATHARTHA Foods ERP",
};

export default async function ActivatePage() {
  await connection();

  if (!isLicenseEnforced()) {
    const session = await auth();
    redirect(session?.user ? "/dashboard" : "/login");
  }

  const status = getLicenseStatus();
  if (status.ok) {
    const session = await auth();
    redirect(session?.user ? "/dashboard" : "/login");
  }

  return (
    <ActivateForm
      machineId={status.machineId}
      version={process.env.npm_package_version ?? "0.1.2"}
    />
  );
}
