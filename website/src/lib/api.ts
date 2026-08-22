export type PublicProduct = {
  sku: string;
  name: string;
  category: string;
  lane: string;
  tier: string;
  packSize: string;
  unitsPerPkt: number;
  usp: number;
  rateB2b: number;
  isActive: boolean;
  sortOrder: number;
  assets?: Array<{ publicUrl: string; title: string; kind: string }>;
};

export type PublicCompany = {
  name: string;
  legalName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  fssai: string;
};

export type PriceList = {
  veg: Array<Pick<PublicProduct, "sku" | "name" | "usp" | "unitsPerPkt" | "rateB2b">>;
  nonVeg: Array<Pick<PublicProduct, "sku" | "name" | "usp" | "unitsPerPkt" | "rateB2b">>;
  updatedAt: string;
};

import { API_URL } from "@/lib/site";

function apiBase() {
  if (!API_URL) return null;
  return API_URL;
}

export async function fetchCompany(): Promise<PublicCompany | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/v1/public/company`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchProducts(category?: "veg" | "non-veg"): Promise<PublicProduct[]> {
  const base = apiBase();
  if (!base) return [];
  const q = category ? `?category=${category}` : "";
  try {
    const res = await fetch(`${base}/v1/public/products${q}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.products ?? [];
  } catch {
    return [];
  }
}

export async function fetchPriceList(): Promise<PriceList | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/v1/public/price-list`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function submitContact(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const base = apiBase();
  if (!base) return { ok: false, error: "Website API not configured" };
  const res = await fetch(`${base}/v1/public/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error ?? "Could not send message" };
  }
  return { ok: true };
}

export function assetUrl(path: string): string {
  const base = apiBase();
  if (!base || path.startsWith("http")) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function money(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}
