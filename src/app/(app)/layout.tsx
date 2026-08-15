import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { requireLicense, requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  requireLicense();
  const user = await requireUser();
  const company = await prisma.company.findUnique({ where: { id: "default" } });
  return (
    <AppShell companyName={company?.name ?? "YATHARTHA Foods & Beverages"} user={user}>
      {children}
    </AppShell>
  );
}
