import Link from "next/link";
import Image from "next/image";
import { CartButton } from "@/components/cart-button";
import { FOOTER_HOT_LINKS, FOOTER_POLICY_LINKS, NAV_LINKS, SERVICE_AREAS } from "@/lib/catalog";
import { CONTACT } from "@/lib/site";
import { MobileNav } from "@/components/mobile-nav";

function NavDropdown({ label, items }: { label: string; items: Array<{ slug: string; href: string; label: string }> }) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm text-white/85 transition hover:bg-white/5 hover:text-white"
      >
        {label}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-70">
          <path d="M2.5 4.5L6 8l3.5-3.5" />
        </svg>
      </button>
      <div className="invisible absolute left-0 top-full z-50 min-w-[220px] rounded-xl border border-white/10 bg-ink py-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={item.href}
            className="block px-4 py-2 text-sm text-white/85 hover:bg-white/5 hover:text-brand"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function HeaderSearch({ className = "" }: { className?: string }) {
  return (
    <form action="/products" className={className}>
      <label className="relative block">
        <span className="sr-only">Search products</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          name="q"
          placeholder="Search"
          className="w-full rounded-full border border-white/15 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand"
        />
      </label>
    </form>
  );
}

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-white/10 bg-ink/95 backdrop-blur">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image src="/logo.png" alt="Yathartha Foods & Beverages" width={180} height={67} className="h-9 w-auto" priority />
        </Link>

        <nav className="hidden items-center gap-0.5 xl:flex">
          {NAV_LINKS.map((link) =>
            "children" in link ? (
              <NavDropdown key={link.label} label={link.label} items={link.children} />
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 whitespace-nowrap rounded-lg px-2 py-2 text-sm text-white/85 transition hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <HeaderSearch className="w-32" />
          <CartButton className="ml-1" />
          <Link
            href="/contact"
            className="whitespace-nowrap rounded-full bg-brand px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Enquire Now
          </Link>
        </div>

        <div className="flex items-center gap-1 xl:hidden">
          <CartButton />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ phone, email }: { phone?: string; email?: string }) {
  const displayPhone = phone ?? CONTACT.phone;
  const displayEmail = email ?? CONTACT.email;

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#1a1d22] text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl text-brand">YATHARTHA</p>
          <p className="text-sm font-semibold tracking-wide text-white/80">Foods & Beverages</p>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Frozen burger patties, nuggets and ready foods for restaurants, hotels, cafes and distributors. Made in
            Pune.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Products</p>
          <ul className="mt-4 space-y-2 text-sm">
            {FOOTER_HOT_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/80 transition hover:text-brand">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Company</p>
          <ul className="mt-4 space-y-2 text-sm">
            {FOOTER_POLICY_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/80 transition hover:text-brand">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Get in touch</p>
          <p className="mt-4">
            <a href={`tel:${displayPhone}`} className="text-lg font-semibold text-brand hover:underline">
              {displayPhone}
            </a>
          </p>
          <p className="mt-2 text-sm text-white/70">{displayEmail}</p>
          <p className="mt-3 text-sm text-white/60">{CONTACT.address}</p>
        </div>
      </div>

      <div className="border-t border-white/5 bg-[#15171b]">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Areas we serve</p>
          <p className="mt-3 text-xs leading-relaxed text-white/50">{SERVICE_AREAS.join(" · ")}</p>
        </div>
      </div>

      <div className="border-t border-white/5 py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Yathartha Foods & Beverages
      </div>
    </footer>
  );
}
