import Link from "next/link";
import type { ReactNode } from "react";
import { DEFAULT_PAGE_SIZE, listHref, pageCount } from "@/lib/list-page";

export function ListPager({
  basePath,
  page,
  total,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
}: {
  basePath: string;
  page: number;
  total: number;
  pageSize?: number;
  query: Record<string, string | undefined>;
}) {
  const pages = pageCount(total, pageSize);
  if (total <= pageSize) {
    return total > 0 ? (
      <p className="px-3 py-2 text-xs text-muted">
        {total} row{total === 1 ? "" : "s"}
      </p>
    ) : null;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-sm">
      <span className="text-xs text-muted">
        {from}–{to} of {total}
      </span>
      <div className="flex gap-3">
        {page > 1 ? (
          <Link
            href={listHref(basePath, query, { page: String(page - 1) })}
            className="font-semibold text-saffron hover:underline"
          >
            Previous
          </Link>
        ) : (
          <span className="text-muted">Previous</span>
        )}
        <span className="text-xs text-muted">
          Page {page} / {pages}
        </span>
        {page < pages ? (
          <Link
            href={listHref(basePath, query, { page: String(page + 1) })}
            className="font-semibold text-saffron hover:underline"
          >
            Next
          </Link>
        ) : (
          <span className="text-muted">Next</span>
        )}
      </div>
    </div>
  );
}

export function SortLink({
  basePath,
  query,
  sortKey,
  currentSort,
  currentDir,
  children,
}: {
  basePath: string;
  query: Record<string, string | undefined>;
  sortKey: string;
  currentSort: string;
  currentDir: "asc" | "desc";
  children: ReactNode;
}) {
  const active = currentSort === sortKey;
  const nextDir = active && currentDir === "asc" ? "desc" : "asc";
  const marker = active ? (currentDir === "asc" ? " ↑" : " ↓") : "";
  return (
    <Link
      href={listHref(basePath, query, { sort: sortKey, dir: nextDir, page: "1" })}
      className="inline-flex items-center hover:text-saffron"
    >
      {children}
      {marker}
    </Link>
  );
}
