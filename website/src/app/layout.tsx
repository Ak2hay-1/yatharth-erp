import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { fetchCompany } from "@/lib/api";
import { CartProvider } from "@/lib/cart";
import { CONTACT, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [{ url: "/logo.png", alt: SITE_NAME }],
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/logo.png"],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const company = await fetchCompany();
  const whatsAppPhone = company?.phone?.trim() || CONTACT.phone;

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <CartProvider whatsAppPhone={whatsAppPhone}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter phone={company?.phone} email={company?.email} />
        </CartProvider>
      </body>
    </html>
  );
}
