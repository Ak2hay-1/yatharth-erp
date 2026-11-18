"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge, Button } from "@/components/ui";
import { getWebsiteInquiriesAction } from "@/server/website-sync";
import { formatDateTime } from "@/lib/utils";

type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
};

export function WebsiteEnquiriesPanel({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);
  const [error, setError] = useState("");

  function load() {
    setError("");
    startTransition(async () => {
      try {
        const rows = (await getWebsiteInquiriesAction()) as Inquiry[];
        setInquiries(
          rows.map((r) => ({
            ...r,
            createdAt: typeof r.createdAt === "string" ? r.createdAt : String(r.createdAt),
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load enquiries.");
      }
    });
  }

  useEffect(() => {
    // Do not auto-fetch on Settings mount — VM sync can take many seconds and stalls the page.
    if (!enabled) {
      setInquiries(null);
      setError("");
    }
  }, [enabled]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl">Website enquiries</h2>
          {inquiries && inquiries.length > 0 ? (
            <Badge tone="warn">{inquiries.length} recent</Badge>
          ) : enabled ? (
            <Badge tone="ok">Ready</Badge>
          ) : (
            <Badge tone="draft">Sync off</Badge>
          )}
        </div>
        <Button type="button" variant="secondary" disabled={pending || !enabled} onClick={load}>
          {pending ? "Loading…" : inquiries ? "Refresh" : "Load enquiries"}
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Contact form submissions from yatharthafoods.in. Enable Website sync below, then click Load enquiries
        (avoids a long hang when opening Settings).
      </p>

      {!enabled ? (
        <p className="rounded-lg border border-line bg-bg px-3 py-3 text-sm text-muted">
          Turn on Website sync and save settings to load enquiries here.
        </p>
      ) : null}

      {error ? <p className="mb-3 text-sm text-bad">{error}</p> : null}

      {enabled && !inquiries && !error && !pending ? (
        <p className="rounded-lg border border-line bg-bg px-3 py-3 text-sm text-muted">
          Click <strong>Load enquiries</strong> to fetch the latest contact-form submissions.
        </p>
      ) : null}

      {enabled && pending && !inquiries ? (
        <p className="rounded-lg border border-line bg-bg px-3 py-3 text-sm text-muted">Loading enquiries…</p>
      ) : null}

      {enabled && inquiries ? (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-bg text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">From</th>
                <th className="px-3 py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-muted" colSpan={3}>
                    No website enquiries yet.
                  </td>
                </tr>
              ) : (
                inquiries.map((row) => (
                  <tr key={row.id} className="border-t border-line align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-muted">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">{row.name}</div>
                      <div className="text-xs text-muted">{row.email}</div>
                      {row.phone ? <div className="text-xs text-muted">{row.phone}</div> : null}
                    </td>
                    <td className="max-w-md px-3 py-2 whitespace-pre-wrap text-ink">{row.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
