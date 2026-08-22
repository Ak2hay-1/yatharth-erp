"use client";

import { useState } from "react";
import { submitContact } from "@/lib/api";
import { CONTACT } from "@/lib/site";

export function ContactForm() {
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
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-[#3A3F47]/60 p-6">
      <label className="block text-sm">
        <span className="text-white/60">Name</span>
        <input name="name" required className="mt-1 w-full rounded-lg border border-white/10 bg-[#23262C] px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="text-white/60">Email</span>
        <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-white/10 bg-[#23262C] px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="text-white/60">Phone</span>
        <input name="phone" className="mt-1 w-full rounded-lg border border-white/10 bg-[#23262C] px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="text-white/60">Message</span>
        <textarea name="message" required rows={5} className="mt-1 w-full rounded-lg border border-white/10 bg-[#23262C] px-3 py-2" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#FE7733] py-3 text-sm font-semibold text-[#23262C] disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send enquiry"}
      </button>
      {status ? <p className="text-sm text-[#B1FA63]">{status}</p> : null}
    </form>
  );
}

export function ContactDetails() {
  return (
    <div>
      <h1 className="font-display text-4xl">Contact</h1>
      <p className="mt-4 text-white/75">Enquiries for distribution, HORECA supply and product samples.</p>
      <div className="mt-8 space-y-4 rounded-2xl bg-[#3A3F47] p-6 text-sm">
        <p>
          <span className="text-white/50">Address</span>
          <br />
          {CONTACT.address}
        </p>
        <p>
          <span className="text-white/50">Phone / WhatsApp</span>
          <br />
          <a href={`tel:${CONTACT.phone}`} className="text-[#FE7733] hover:underline">
            {CONTACT.phone}
          </a>
        </p>
        <p>
          <span className="text-white/50">Email</span>
          <br />
          {CONTACT.email}
        </p>
      </div>
    </div>
  );
}
