import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLicenseStatus, isLicenseEnforced } from "@/lib/license";

export default async function Home() {
  if (isLicenseEnforced() && !getLicenseStatus().ok) {
    redirect("/activate");
  }
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/login");
}
