"use client";

import Link from "next/link";
import { useState } from "react";
import { NAV_LINKS, type NavLink } from "@/lib/catalog";

function isNavGroup(link: NavLink): link is Extract<NavLink, { children: unknown }> {
  return "children" in link;
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}
        className="rounded-lg p-2 text-white/85 hover:bg-white/10"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-white/10 bg-[#23262C] shadow-xl">
          <nav className="mx-auto max-w-6xl space-y-1 px-4 py-4">
            {NAV_LINKS.map((link) =>
              isNavGroup(link) ? (
                <div key={link.label} className="py-2">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-white/40">{link.label}</p>
                  {link.children.map((child) => (
                    <Link
                      key={child.slug}
                      href={child.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/5"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href!}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/5"
                >
                  {link.label}
                </Link>
              ),
            )}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 block rounded-lg bg-[#FE7733] px-4 py-3 text-center text-sm font-semibold text-[#23262C]"
            >
              Enquire
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
