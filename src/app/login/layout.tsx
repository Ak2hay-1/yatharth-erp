import { requireLicense } from "@/lib/session";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  requireLicense();
  return children;
}
