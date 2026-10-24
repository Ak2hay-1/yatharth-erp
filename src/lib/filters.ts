import { parseCalendarDate } from "@/lib/utils";

export type ListQuery = {
  q: string;
  status: string;
  from?: string;
  to?: string;
};

export function parseListQuery(sp: { q?: string; status?: string; from?: string; to?: string }): ListQuery {
  return {
    q: (sp.q ?? "").trim(),
    status: (sp.status ?? "").trim(),
    from: sp.from || undefined,
    to: sp.to || undefined,
  };
}

export function dateRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  const range: { gte?: Date; lte?: Date } = {};
  if (from) {
    const start = parseCalendarDate(from);
    if (start) range.gte = start;
  }
  if (to) {
    const start = parseCalendarDate(to);
    if (start) range.lte = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  }
  if (!range.gte && !range.lte) return undefined;
  return range;
}

export function contains(q: string) {
  return { contains: q };
}

export function actionErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : "Something went wrong";
  if (raw.includes("Unique constraint")) {
    if (raw.toLowerCase().includes("sku")) return "That SKU already exists.";
    if (raw.toLowerCase().includes("email")) return "That email already exists.";
    return "A record with that value already exists.";
  }
  return raw;
}
