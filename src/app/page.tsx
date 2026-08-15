import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLicenseStatus, isLicenseEnforced } from "@/lib/license";

export default async function Home() {
  await connection();

  if (isLicenseEnforced() && !getLicenseStatus().ok) {
    redirect("/activate");
  }
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/login");
}
