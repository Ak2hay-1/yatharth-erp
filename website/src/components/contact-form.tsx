"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { submitContact } from "@/lib/api";
import { CONTACT } from "@/lib/site";

export function ContactForm() {
  const searchParams = useSearchParams();
  const product = (searchParams.get("product") ?? "").trim();
  const defaultMessage = useMemo(
    () =>
      product
        ? `I am interested in ordering: ${product}\n\nQuantity / pack preference:\nDelivery area:\nNotes:`
        : "",
    [product],
  );

  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setStatus(null);
    const fd = new FormData(e.currentTarget);
    const res = await submitContact({
      name: String(fd.get("name")),
      email: String(fd.get("email")),
      phone: String(fd.get("phone") ?? ""),
      message: String(fd.get("message")),
    });
    setPending(false);
    setStatus(res.ok ? "Thank you — we will get back to you soon." : res.error ?? "Something went wrong.");
    if (res.ok) e.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      {product ? (
        <p className="rounded-lg bg-[#FE7733]/10 px-3 py-2 text-sm text-[#23262C]">
          Enquiry about <span className="font-semibold">{product}</span>
        </p>
      ) : null}
      <label className="block text-sm">
        <span className="text-neutral-500">Name</span>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900"
        />
      </label>
      <label className="block text-sm">
        <span className="text-neutral-500">Email</span>
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900"
        />
      </label>
      <label className="block text-sm">
        <span className="text-neutral-500">Phone</span>
        <input
          name="phone"
          className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900"
        />
      </label>
      <label className="block text-sm">
        <span className="text-neutral-500">Message</span>
        <textarea
          name="message"
          required
          rows={5}
          defaultValue={defaultMessage}
          key={defaultMessage}
          className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#FE7733] py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send enquiry"}
      </button>
      {status ? <p className="text-sm text-emerald-600">{status}</p> : null}
    </form>
  );
}

export function ContactDetails() {
  return (
    <div>
      <h1 className="font-display text-4xl text-neutral-900">Contact</h1>
      <p className="mt-4 text-neutral-600">Enquiries for distribution, HORECA supply and product samples.</p>
      <div className="mt-8 space-y-4 rounded-2xl bg-white p-6 text-sm shadow-sm ring-1 ring-neutral-200">
        <p>
          <span className="text-neutral-400">Address</span>
          <br />
          <span className="text-neutral-700">{CONTACT.address}</span>
        </p>
        <p>
          <span className="text-neutral-400">Phone / WhatsApp</span>
          <br />
          <a href={`tel:${CONTACT.phone}`} className="text-lg font-semibold text-[#FE7733] hover:underline">
            {CONTACT.phone}
          </a>
        </p>
        <p>
          <span className="text-neutral-400">Email</span>
          <br />
          <span className="text-neutral-700">{CONTACT.email}</span>
        </p>
      </div>
    </div>
  );
}
