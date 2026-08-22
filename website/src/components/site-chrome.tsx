import Link from "next/link";
import Image from "next/image";
import { CONTACT } from "@/lib/site";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/products", label: "Products" },
  { href: "/price-list", label: "Price list" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-white/10 bg-[#23262C]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Yathartha Foods & Beverages" width={160} height={48} className="h-10 w-auto" priority />
        </Link>
        <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-white/85 transition hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="ml-1 rounded-lg bg-[#FE7733] px-4 py-2 text-sm font-semibold text-[#23262C] transition hover:brightness-110"
          >
            Enquire
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ phone, email }: { phone?: string; email?: string }) {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#1a1d22]">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="font-display text-lg text-[#FE7733]">YATHARTHA</p>
          <p className="text-sm text-[#B1FA63]">Foods & Beverages</p>
          <p className="mt-3 text-sm text-white/70">Frozen burger patties, nuggets & more for HORECA and distributors across Pune.</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Quick links</p>
          <ul className="mt-3 space-y-2 text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/80 hover:text-[#FE7733]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Contact</p>
          <p className="mt-3 text-sm text-white/80">{phone ? `Phone: ${phone}` : `Phone: ${CONTACT.phone}`}</p>
          <p className="text-sm text-white/80">{email ?? CONTACT.email}</p>
          <p className="mt-2 text-sm text-white/60">Chinchwad, Pune — 411033</p>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Yathartha Foods & Beverages
      </div>
    </footer>
  );
}
