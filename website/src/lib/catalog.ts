export type ProductCategory = {
  slug: string;
  title: string;
  description: string;
  href: string;
  image: string;
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    slug: "veg-patties",
    title: "Veg Patties",
    description: "Aloo patties, veg patties, cheese patties and more.",
    href: "/products?tab=veg",
    image: "/marketing/category-veg-patties.jpg",
  },
  {
    slug: "non-veg-patties",
    title: "Non-Veg Patties",
    description: "Chicken patties, spicy patties and premium variants.",
    href: "/products?tab=non-veg",
    image: "/marketing/category-nonveg-patties.jpg",
  },
  {
    slug: "nuggets",
    title: "Nuggets & Snacks",
    description: "Veg and chicken nuggets, poppers and more.",
    href: "/products?tab=nuggets",
    image: "/marketing/category-nuggets.jpg",
  },
  {
    slug: "horeca",
    title: "HORECA Packs",
    description: "Bulk packaging for restaurants, hotels and institutions.",
    href: "/price-list",
    image: "/marketing/category-horeca-pack.jpg",
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

export const TRUST_POINTS = [
  { title: "Consistent quality", body: "Same taste, every batch" },
  { title: "Hygienic manufacturing", body: "Controlled plant processes" },
  { title: "Reliable supply", body: "Cold-chain dispatch from Pune" },
  { title: "Bulk & HORECA packs", body: "Rates built for volume" },
  { title: "Made in Pune", body: "Chinchwad plant" },
];

export const WHY_CHOOSE = [
  {
    title: "Quality ingredients",
    body: "Recipes built on consistent raw materials so kitchens can rely on the result.",
  },
  {
    title: "Hygienic manufacturing",
    body: "Patties and nuggets are produced under FSSAI-compliant processes at our Chinchwad plant.",
  },
  {
    title: "Consistent taste",
    body: "Standard batches mean Monday service and weekend rush taste the same.",
  },
  {
    title: "Reliable supply",
    body: "Cold-chain dispatch for Pune and nearby regions, with batch traceability at the plant.",
  },
  {
    title: "Business focused",
    body: "Packed and priced for restaurants, cafes, hotels, QSR chains and distributors.",
  },
];

export const AUDIENCES = ["Restaurants", "Cafes", "Hotels", "Cloud kitchens", "QSR chains"];

export const PARTNER_OFFERS = [
  {
    title: "Bulk supply",
    body: "HORECA and distributor packs with clear per-packet rates.",
  },
  {
    title: "Custom packaging",
    body: "Ask about pack sizes that fit your outlet or chain.",
  },
  {
    title: "Regular dispatch",
    body: "Cold-chain dispatch from our Chinchwad plant.",
  },
  {
    title: "Dedicated support",
    body: "A direct line for samples, repeat orders and partnerships.",
  },
];

export type NavLink =
  | { href: string; label: string }
  | { label: string; children: Array<{ slug: string; href: string; label: string }> };

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  {
    label: "Products",
    children: [
      { slug: "all", href: "/products", label: "All products" },
      ...PRODUCT_CATEGORIES.map((c) => ({ slug: c.slug, href: c.href, label: c.title })),
    ],
  },
  { href: "/about", label: "About Us" },
  { href: "/why-frozen-food", label: "Why Frozen Food" },
  { href: "/price-list", label: "E-Catalog" },
  { href: "/contact", label: "Contact" },
];

export const FOOTER_HOT_LINKS = [
  { label: "Veg patties", href: "/products?tab=veg" },
  { label: "Non-veg patties", href: "/products?tab=non-veg" },
  { label: "Nuggets & snacks", href: "/products?tab=nuggets" },
  { label: "E-catalog", href: "/price-list" },
];

export const FOOTER_POLICY_LINKS = [
  { label: "About us", href: "/about" },
  { label: "Why frozen food", href: "/why-frozen-food" },
  { label: "Contact", href: "/contact" },
  { label: "Your order", href: "/order" },
];

export const PRODUCT_TABS = [
  { id: "all", label: "All" },
  { id: "veg", label: "Veg" },
  { id: "non-veg", label: "Non-veg" },
  { id: "nuggets", label: "Nuggets" },
  { id: "packs", label: "Packs" },
] as const;

export type ProductTab = (typeof PRODUCT_TABS)[number]["id"];
