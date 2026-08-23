"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { HERO_SLIDES } from "@/lib/catalog";

export function HeroCarousel() {
  const [active, setActive] = useState(0);

  const next = useCallback(() => {
    setActive((i) => (i + 1) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = HERO_SLIDES[active];

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} transition-all duration-700`} />
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-[0.04]" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B1FA63]">{slide.eyebrow}</p>
          <h1 className="font-display mt-4 text-4xl leading-tight text-white md:text-5xl">{slide.title}</h1>
          <p className="mt-5 max-w-xl text-lg text-white/75">{slide.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={slide.cta.href}
              className="rounded-lg bg-[#FE7733] px-5 py-3 text-sm font-semibold text-[#23262C] transition hover:brightness-110"
            >
              {slide.cta.label}
            </Link>
            <Link
              href={slide.ctaSecondary.href}
              className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#B1FA63]"
            >
              {slide.ctaSecondary.label}
            </Link>
          </div>
        </div>

        <div className="hidden md:grid grid-cols-2 gap-4">
          {[
            { title: "Veg range", desc: "Aloo, veg & corn nuggets", tone: "#B1FA63" },
            { title: "Non-veg range", desc: "Chicken patties & nuggets", tone: "#FE7733" },
            { title: "HORECA packs", desc: "USP-based packet pricing", tone: "#ffffff" },
            { title: "Pune plant", desc: "PCMC Link Road, Chinchwad", tone: "#B1FA63" },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: card.tone }}>
                {card.title}
              </p>
              <p className="mt-2 text-sm text-white/80">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mx-auto flex max-w-6xl gap-2 px-4 pb-8">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-1.5 flex-1 rounded-full transition ${i === active ? "bg-[#FE7733]" : "bg-white/25 hover:bg-white/40"}`}
          />
        ))}
      </div>
    </section>
  );
}
