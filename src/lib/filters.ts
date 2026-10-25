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

const SLOW_SAVE = "That save took too long and was not completed. Please try again.";
const SAVE_FAILED = "Something went wrong while saving. Please try again.";

export function errorText(e: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let cur: unknown = e;
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    if (cur instanceof Error && cur.message) parts.push(cur.message);
    const code = (cur as { code?: unknown }).code;
    if (typeof code === "string") parts.push(code);
    const meta = (cur as { meta?: unknown }).meta;
    if (typeof meta === "string") parts.push(meta);
    else if (meta && typeof meta === "object") parts.push(JSON.stringify(meta));
    cur = (cur as { cause?: unknown }).cause;
  }
  return parts.join("\n");
}

export function isStaleTransactionText(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes("transaction not found") ||
    lower.includes("expired transaction") ||
    lower.includes("transaction already closed") ||
    lower.includes("timeout for this transaction") ||
    lower.includes("unable to start a transaction") ||
    raw.includes("P2028")
  );
}

function isDriverText(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes("prisma") ||
    lower.includes("invocation") ||
    lower.includes("connectorerror") ||
    lower.includes("postgres") ||
    lower.includes("sqlstate") ||
    lower.includes("statement timeout") ||
    lower.includes("canceling statement") ||
    lower.includes("current transaction is aborted") ||
    isStaleTransactionText(raw) ||
    /P20\d{2}/.test(raw)
  );
}

export function actionErrorMessage(e: unknown): string {
  const raw = errorText(e);
  const lower = raw.toLowerCase();
  const plain = e instanceof Error && e.message ? e.message : "";
  if (
    isStaleTransactionText(raw) ||
    lower.includes("statement timeout") ||
    lower.includes("canceling statement")
  ) {
    return SLOW_SAVE;
  }
  if (lower.includes("unique constraint") || raw.includes("P2002")) {
    if (lower.includes("sku")) return "That SKU already exists.";
    if (lower.includes("email")) return "That email already exists.";
    return "A record with that value already exists.";
  }
  if (lower.includes("foreign key constraint") || raw.includes("P2003")) {
    return "That record is still used somewhere else.";
  }
  if (!plain || isDriverText(plain) || isDriverText(raw)) return SAVE_FAILED;
  return plain;
}
