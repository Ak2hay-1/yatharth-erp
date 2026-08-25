"use client";

import { useEffect, useState, useTransition } from "react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Button, Field, Input } from "@/components/ui";
import {
  getWebsiteInquiriesAction,
  getWebsiteSyncRemoteStatusAction,
  saveWebsiteSync,
} from "@/server/website-sync";
import type { WebsiteSyncSettings } from "@/lib/website-sync-config";
import { formatDateTime } from "@/lib/utils";

type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
};

export function WebsiteSyncPanel({ settings }: { settings: WebsiteSyncSettings }) {
  const [pending, startTransition] = useTransition();
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<string>("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!settings.enabled) return;
    const id = window.setInterval(() => {
      void fetch("/api/sync/flush", { method: "POST" }).catch(() => undefined);
    }, 120_000);
    return () => window.clearInterval(id);
  }, [settings.enabled]);

  function loadInquiries() {
    setLocalError("");
    startTransition(async () => {
      try {
        const rows = (await getWebsiteInquiriesAction()) as Inquiry[];
        setInquiries(
          rows.map((r) => ({
            ...r,
            createdAt: typeof r.createdAt === "string" ? r.createdAt : String(r.createdAt),
          })),
        );
        const status = await getWebsiteSyncRemoteStatusAction();
        setRemoteStatus(JSON.stringify(status));
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : "Could not load enquiries.");
      }
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl">Website sync</h2>
        {settings.enabled ? <Badge tone="ok">Enabled</Badge> : <Badge tone="draft">Off</Badge>}
      </div>
      <p className="mb-4 text-sm text-muted">
        Publishes finished goods, prices, and pack photos to the public site at yatharthafoods.in
        via the VM API. While sync is enabled, queued changes flush about every 2 minutes.
      </p>

      <ActionForm action={saveWebsiteSync} className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings.enabled}
            className="accent-[var(--saffron,#fe7733)]"
          />
          Enable website sync
        </label>

        <Field label="VM API URL" className="md:col-span-2">
          <Input
            name="apiUrl"
            required
            defaultValue={settings.apiUrl}
            placeholder="https://api.yatharthafoods.in"
          />
        </Field>

        <Field label="Sync secret" className="md:col-span-2">
          <Input
            name="syncSecret"
            type="password"
            autoComplete="off"
            defaultValue={settings.syncSecret}
            placeholder="Same as VM SYNC_SECRET"
          />
        </Field>

        <div className="flex flex-wrap gap-2 md:col-span-2">
          <SubmitButton name="intent" value="save">
            Save sync settings
          </SubmitButton>
          <SubmitButton name="intent" value="publish" variant="secondary" pendingLabel="Publishing…">
            Publish to website
          </SubmitButton>
          <SubmitButton name="intent" value="flush" variant="secondary" pendingLabel="Flushing…">
            Flush queue now
          </SubmitButton>
          <Button type="button" variant="secondary" disabled={pending} onClick={loadInquiries}>
            Load enquiries
          </Button>
        </div>
      </ActionForm>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Last publish</dt>
          <dd className="mt-1 text-ink">
            {settings.lastPublishAt ? formatDateTime(settings.lastPublishAt) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Last flush</dt>
          <dd className="mt-1 text-ink">
            {settings.lastFlushAt ? formatDateTime(settings.lastFlushAt) : "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Status</dt>
          <dd className="mt-1 text-ink">{settings.lastStatus || "—"}</dd>
        </div>
        {settings.lastError ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Last error</dt>
            <dd className="mt-1 text-sm text-bad">{settings.lastError}</dd>
          </div>
        ) : null}
      </dl>

      {localError ? <p className="mt-3 text-sm text-bad">{localError}</p> : null}
      {remoteStatus ? (
        <p className="mt-2 break-all font-mono text-xs text-muted">{remoteStatus}</p>
      ) : null}

      {inquiries ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
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
