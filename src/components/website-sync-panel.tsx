"use client";

import { useEffect, useState, useTransition } from "react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Button, Field, Input } from "@/components/ui";
import { getWebsiteSyncRemoteStatusAction, saveWebsiteSync } from "@/server/website-sync";
import type { WebsiteSyncSettings } from "@/lib/website-sync-config";
import { formatDateTime } from "@/lib/utils";

export function WebsiteSyncPanel({ settings }: { settings: WebsiteSyncSettings }) {
  const [pending, startTransition] = useTransition();
  const [remoteStatus, setRemoteStatus] = useState<string>("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!settings.enabled) return;
    const id = window.setInterval(() => {
      void fetch("/api/sync/flush", { method: "POST" }).catch(() => undefined);
    }, 120_000);
    return () => window.clearInterval(id);
  }, [settings.enabled]);

  function loadRemoteStatus() {
    setLocalError("");
    startTransition(async () => {
      try {
        const status = await getWebsiteSyncRemoteStatusAction();
        setRemoteStatus(JSON.stringify(status));
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : "Could not reach sync API.");
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
          <Button type="button" variant="secondary" disabled={pending} onClick={loadRemoteStatus}>
            Check remote status
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

      <p className="mt-4 text-sm text-muted">
        Website contact enquiries appear in the <span className="font-medium text-ink">Website enquiries</span> section
        above.
      </p>
    </div>
  );
}
