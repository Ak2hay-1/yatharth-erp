"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { submitContact } from "@/lib/api";

const BUSINESS_TYPES = ["Restaurant", "Cafe", "Hotel", "Cloud kitchen", "QSR chain", "Distributor", "Other"];

export function ContactForm() {
  const searchParams = useSearchParams();
  const product = (searchParams.get("product") ?? "").trim();
  const intent = searchParams.get("intent");
  const defaultType = intent === "distributor" ? "Distributor" : "Restaurant";
  const defaultMessage = useMemo(() => {
    if (product) {
      return `I am interested in ordering: ${product}\n\nQuantity / pack preference:\nDelivery area:\nNotes:`;
    }
    if (intent === "distributor") {
      return "I would like to become a distributor.\n\nCity / area:\nCurrent distribution lines:\n";
    }
    if (intent === "catalog") {
      return "Please send a physical copy of the product catalogue.\n\nDelivery address:\n";
    }
    return "";
  }, [product, intent]);

  const [status, setStatus] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setStatus(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const businessName = String(fd.get("business") ?? "").trim();
    const businessType = String(fd.get("businessType") ?? "").trim();
    const note = String(fd.get("message") ?? "").trim();
    const message = [
      businessName ? `Business: ${businessName}` : "",
      businessType ? `Business type: ${businessType}` : "",
      note,
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await submitContact({
      name: String(fd.get("name")),
      email: String(fd.get("email")),
      phone: String(fd.get("phone") ?? ""),
      message,
    });
    setPending(false);
    setOk(res.ok);
    setStatus(res.ok ? "Thank you — we will get back to you soon." : res.error ?? "Something went wrong.");
    if (res.ok) form.reset();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <h2 className="font-display text-2xl text-ink">Send an enquiry</h2>
      {product ? (
        <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-ink">
          Enquiry about <span className="font-semibold">{product}</span>
        </p>
      ) : null}
      {intent === "distributor" ? (
        <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-ink">Distributor partnership enquiry</p>
      ) : null}
      <label className="block text-sm">
        <span className="text-muted">Name</span>
        <input name="name" required className="mt-1 w-full rounded-lg border border-neutral-200 bg-cream px-3 py-2 text-ink" />
      </label>
      <label className="block text-sm">
        <span className="text-muted">Business name</span>
        <input name="business" className="mt-1 w-full rounded-lg border border-neutral-200 bg-cream px-3 py-2 text-ink" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted">Phone</span>
          <input name="phone" className="mt-1 w-full rounded-lg border border-neutral-200 bg-cream px-3 py-2 text-ink" />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-neutral-200 bg-cream px-3 py-2 text-ink"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-muted">Business type</span>
        <select
          key={defaultType}
          name="businessType"
          defaultValue={defaultType}
          className="mt-1 w-full rounded-lg border border-neutral-200 bg-cream px-3 py-2 text-ink"
        >
          {BUSINESS_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-muted">Message</span>
        <textarea
          name="message"
          required
          rows={5}
          defaultValue={defaultMessage}
          key={defaultMessage}
          className="mt-1 w-full rounded-lg border border-neutral-200 bg-cream px-3 py-2 text-ink"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send enquiry"}
      </button>
      {status ? <p className={`text-sm ${ok ? "text-veg" : "text-red-700"}`}>{status}</p> : null}
    </form>
  );
}

export function ContactDetails({
  address,
  phone,
  email,
}: {
  address: string;
  phone: string;
  email: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Contact</p>
      <h1 className="font-display mt-3 text-4xl text-ink md:text-5xl">Get in touch</h1>
      <p className="mt-4 text-muted">Enquiries for distribution, HORECA supply, samples and quotes.</p>
      <div className="mt-8 space-y-4 rounded-2xl bg-white p-6 text-sm shadow-sm ring-1 ring-black/5">
        <p>
          <span className="text-muted">Our location</span>
          <br />
          <span className="whitespace-pre-line text-ink">{address}</span>
        </p>
        <p>
          <span className="text-muted">Call us</span>
          <br />
          <a href={`tel:${phone}`} className="text-lg font-semibold text-brand hover:underline">
            {phone}
          </a>
        </p>
        <p>
          <span className="text-muted">Email us</span>
          <br />
          <a href={`mailto:${email}`} className="text-ink hover:text-brand">
            {email}
          </a>
        </p>
        <p>
          <span className="text-muted">Business hours</span>
          <br />
          <span className="text-ink">Mon–Sat, 9:00 AM – 6:00 PM</span>
        </p>
      </div>
    </div>
  );
}
