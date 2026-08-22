/** Production marketing site — https://yatharthafoods.in */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://yatharthafoods.in").replace(/\/+$/, "");

/** VM sync API — https://api.yatharthafoods.in (set via Vercel env) */
export const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ?? "";

export const SITE_NAME = "Yathartha Foods & Beverages";
export const SITE_DESCRIPTION =
  "Frozen burger patties, nuggets and ready foods for HORECA and distributors in Pune.";

export const CONTACT = {
  phone: "7028832038",
  email: "accounts@yatharthfoods.in",
  address: "Shop No. 29, Harshal Heights, PCMC Link Road, Gawade Nagar, Chinchwad, Pune — 411033",
} as const;
