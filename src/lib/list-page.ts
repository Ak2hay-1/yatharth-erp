export const DEFAULT_PAGE_SIZE = 50;

export function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : 1;
}

export function parseSortDir(raw?: string): "asc" | "desc" {
  return raw === "asc" ? "asc" : "desc";
}

export function parseSortKey(raw: string | undefined, allowed: readonly string[], fallback: string): string {
  return raw && allowed.includes(raw) ? raw : fallback;
}

export function pageSkip(page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return (page - 1) * pageSize;
}

export function pageCount(total: number, pageSize = DEFAULT_PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Build a query string preserving existing filters and updating sort/page. */
export function listHref(
  basePath: string,
  current: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  for (const [key, value] of Object.entries(merged)) {
    if (value == null || value === "") continue;
    if (key === "page" && value === "1") continue;
    params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
