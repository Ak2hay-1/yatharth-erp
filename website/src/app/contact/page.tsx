import type { Metadata } from "next";
import { ContactDetails, ContactForm } from "@/components/contact-form";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${SITE_NAME} for HORECA supply and distribution enquiries in Pune.`,
};

export default function ContactPage() {
  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2">
          <ContactDetails />
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
