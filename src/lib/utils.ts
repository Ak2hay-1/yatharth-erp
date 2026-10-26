import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function round3(n: number) {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

export function money(n: number) {
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function qty(n: number, unit?: string) {
  const v = Number.isInteger(n) ? String(n) : n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
  return unit ? `${v} ${unit}` : v;
}

export const APP_TZ = "Asia/Kolkata";
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export function istParts(d = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
  };
}

function ymd(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayInputDate(now = new Date()) {
  const p = istParts(now);
  return ymd(p.year, p.month, p.day);
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: APP_TZ,
  });
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TZ,
  });
}

/** Calendar day in Asia/Kolkata, as `YYYY-MM-DD` for `<input type="date">`. */
export function toInputDate(d?: Date | string | null) {
  if (d == null || d === "") return todayInputDate();
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return todayInputDate();
  const p = istParts(date);
  return ymd(p.year, p.month, p.day);
}

/** `YYYY-MM-DDTHH:mm` in Asia/Kolkata for `<input type="datetime-local">`. */
export function toInputDateTime(d?: Date | string | null) {
  const date = d ? (typeof d === "string" ? new Date(d) : d) : new Date();
  if (Number.isNaN(date.getTime())) return `${todayInputDate()}T09:00`;
  const p = istParts(date);
  return `${ymd(p.year, p.month, p.day)}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** Parse `YYYY-MM-DD` as midnight in Asia/Kolkata. Returns null when the day is not real. */
export function parseCalendarDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET_MS);
  const p = istParts(date);
  if (p.year !== year || p.month !== month || p.day !== day) return null;
  return date;
}

/** Parse a date or `YYYY-MM-DDTHH:mm` as Asia/Kolkata wall time. */
export function parseCalendarDateTime(value: string): Date | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return parseCalendarDate(trimmed);
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(trimmed);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  if (hour > 23 || minute > 59) return null;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - IST_OFFSET_MS);
  const p = istParts(date);
  if (p.year !== year || p.month !== month || p.day !== day || p.hour !== hour || p.minute !== minute) return null;
  return date;
}

export function requireCalendarDate(value: string, label: string) {
  const date = parseCalendarDate(value);
  if (!date) throw new Error(`${label} is not a valid date`);
  return date;
}

export function startOfTodayIst(now = new Date()) {
  return parseCalendarDate(todayInputDate(now)) ?? new Date();
}

export function endOfDayIst(day: Date) {
  const start = parseCalendarDate(toInputDate(day));
  if (!start) return day;
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function monthBoundsIst(ref = new Date()) {
  const { year, month } = istParts(ref);
  const start = parseCalendarDate(ymd(year, month, 1)) ?? ref;
  const next =
    month === 12
      ? parseCalendarDate(ymd(year + 1, 1, 1))
      : parseCalendarDate(ymd(year, month + 1, 1));
  const end = new Date((next ?? start).getTime() - 1);
  return { start, end, key: `${year}-${String(month).padStart(2, "0")}` };
}

/** A lot is not sellable on its expiry day or after. Null expiry never expires. */
export function isExpiredLot(expiry: Date | string | null | undefined, asOf = startOfTodayIst()) {
  if (!expiry) return false;
  const date = typeof expiry === "string" ? new Date(expiry) : expiry;
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= endOfDayIst(asOf).getTime();
}

/** Add calendar days in Asia/Kolkata and return that day's IST midnight. */
export function addDays(d: Date, days: number) {
  const [year, month, day] = toInputDate(d).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const next = ymd(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
  return parseCalendarDate(next) ?? d;
}

export function parseNum(v: FormDataEntryValue | null, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function requiredString(v: FormDataEntryValue | null, label: string) {
  const s = String(v ?? "").trim();
  if (!s) throw new Error(`${label} is required`);
  return s;
}

export function rethrowRedirect(e: unknown) {
  if (e && typeof e === "object" && "digest" in e) {
    const digest = String((e as { digest?: string }).digest ?? "");
    if (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND")) {
      throw e;
    }
  }
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigit(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? " " + ONES[o] : ""}`.trim();
}

function threeDigit(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = h ? `${ONES[h]} Hundred` : "";
  const tail = r ? twoDigit(r) : "";
  return [head, tail].filter(Boolean).join(" ");
}

export function amountInWords(amount: number): string {
  const n = Math.round(amount * 100) / 100;
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${twoDigit(crore)} Crore`);
  if (lakh) parts.push(`${twoDigit(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigit(thousand)} Thousand`);
  if (hundred) parts.push(threeDigit(hundred));

  let out = `${parts.join(" ")} Rupees`.replace(/\s+/g, " ").trim();
  if (paise) out += ` and ${twoDigit(paise)} Paise`;
  return `${out} Only`;
}

export const UNITS = ["kg", "g", "L", "ml", "pcs", "pack", "carton", "bag"] as const;
export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];

export function stateName(code: string) {
  return INDIAN_STATES.find((s) => s.code === code)?.name ?? code;
}
