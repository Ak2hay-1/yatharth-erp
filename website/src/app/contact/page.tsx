import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactDetails, ContactForm } from "@/components/contact-form";
import { fetchCompany } from "@/lib/api";
import { CONTACT, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${SITE_NAME} for HORECA supply and distribution enquiries in Pune.`,
};

export default async function ContactPage() {
  const company = await fetchCompany();
  const address = company
    ? [company.address, [company.city, company.state].filter(Boolean).join(", "), company.pincode]
        .filter(Boolean)
        .join("\n")
    : CONTACT.address;

  return (
    <div className="min-h-full bg-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2">
        <ContactDetails
          address={address}
          phone={company?.phone?.trim() || CONTACT.phone}
          email={company?.email?.trim() || CONTACT.email}
        />
        <Suspense fallback={<div className="rounded-2xl bg-white p-6 text-sm text-muted ring-1 ring-black/5">Loading form…</div>}>
          <ContactForm />
        </Suspense>
      </div>
    </div>
  );
}
