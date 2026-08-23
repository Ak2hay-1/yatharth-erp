export type ProductCategory = {
  slug: string;
  title: string;
  description: string;
  href: string;
  gradient: string;
  emoji: string;
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    slug: "veg-patties",
    title: "Veg Patties",
    description: "Aloo, corn & veg burger patties",
    href: "/products?tab=veg",
    gradient: "from-emerald-600/80 to-lime-500/60",
    emoji: "🥬",
  },
  {
    slug: "non-veg-patties",
    title: "Non-Veg Patties",
    description: "Chicken patties & crispy variants",
    href: "/products?tab=non-veg",
    gradient: "from-orange-600/80 to-amber-500/60",
    emoji: "🍗",
  },
  {
    slug: "nuggets",
    title: "Nuggets & Snacks",
    description: "Veg & cheese nuggets for QSR",
    href: "/products?tab=veg",
    gradient: "from-yellow-600/70 to-orange-500/50",
    emoji: "🧀",
  },
  {
    slug: "horeca",
    title: "HORECA Packs",
    description: "USP-based B2B packet pricing",
    href: "/price-list",
    gradient: "from-slate-600/80 to-slate-500/60",
    emoji: "📦",
  },
  {
    slug: "ready-to-eat",
    title: "Ready To Serve",
    description: "Consistent taste, quick prep",
    href: "/products",
    gradient: "from-red-700/70 to-orange-600/50",
    emoji: "⚡",
  },
  {
    slug: "distributors",
    title: "For Distributors",
    description: "Cold-chain dispatch from Pune",
    href: "/contact",
    gradient: "from-blue-700/70 to-cyan-600/50",
    emoji: "🚚",
  },
];

export const HERO_SLIDES = [
  {
    id: "patties",
    eyebrow: "Frozen foods manufacturer",
    title: "Premium burger patties for restaurants & QSR",
    subtitle: "Veg and non-veg lines made in Chinchwad, Pune — consistent quality with cold-chain dispatch.",
    cta: { label: "View products", href: "/products" },
    ctaSecondary: { label: "B2B price list", href: "/price-list" },
    gradient: "from-[#23262C] via-[#3A3F47] to-[#FE7733]/40",
  },
  {
    id: "horeca",
    eyebrow: "HORECA supply",
    title: "Trusted partner for cafes, hotels & distributors",
    subtitle: "Clear USP and per-packet B2B rates. Batch traceability and FEFO stock at our plant.",
    cta: { label: "Get price list", href: "/price-list" },
    ctaSecondary: { label: "Contact us", href: "/contact" },
    gradient: "from-[#1a1d22] via-[#23262C] to-[#B1FA63]/20",
  },
  {
    id: "quality",
    eyebrow: "Made in Pune",
    title: "Quality frozen foods with local support",
    subtitle: "Fast dispatch across Pune PCMC. Enquire for samples and distribution partnerships.",
    cta: { label: "Enquire now", href: "/contact" },
    ctaSecondary: { label: "About us", href: "/about" },
    gradient: "from-[#23262C] via-[#FE7733]/30 to-[#23262C]",
  },
];

export const SERVICE_AREAS = [
  "Pune",
  "Pimpri-Chinchwad",
  "Hinjewadi",
  "Wakad",
  "Baner",
  "Kothrud",
  "Hadapsar",
  "Kharadi",
  "Viman Nagar",
  "Magarpatta",
  "Aundh",
  "Balewadi",
  "Pimple Saudagar",
  "Ravet",
  "Nigdi",
  "Akurdi",
  "Bhosari",
  "Chakan",
  "Talegaon",
  "Lonavala",
  "Mumbai",
  "Nashik",
  "Satara",
  "Kolhapur",
  "Ahmednagar",
  "Solapur",
  "Aurangabad",
  "Nagpur",
];

export type NavLink =
  | { href: string; label: string }
  | { label: string; children: Array<{ slug: string; href: string; label: string }> };

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  {
    label: "Product Categories",
    children: PRODUCT_CATEGORIES.map((c) => ({ slug: c.slug, href: c.href, label: c.title })),
  },
  { href: "/about", label: "About Us" },
  { href: "/why-frozen-food", label: "Why Frozen Food" },
  { href: "/price-list", label: "E-Catalog" },
  { href: "/contact", label: "Contact Us" },
];

export const FOOTER_HOT_LINKS = [
  { label: "Veg patties", href: "/products?tab=veg" },
  { label: "Non-veg patties", href: "/products?tab=non-veg" },
  { label: "B2B price list", href: "/price-list" },
  { label: "All products", href: "/products" },
];

export const FOOTER_POLICY_LINKS = [
  { label: "Contact information", href: "/contact" },
  { label: "About us", href: "/about" },
  { label: "Why frozen food", href: "/why-frozen-food" },
];
