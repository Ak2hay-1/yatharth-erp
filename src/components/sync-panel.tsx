"use client";

import { useState, useTransition } from "react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { saveSyncSettings, testSyncConnection, publishWebsiteNow } from "@/server/sync";
import type { SyncConfig } from "@/lib/sync/types";
import { formatDateTime } from "@/lib/utils";

export function SyncPanel({ config }: { config: SyncConfig }) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleTest() {
    startTransition(async () => {
      const res = await testSyncConnection();
      setStatus(res.ok ? `Connected — ${res.status?.productCount ?? 0} products on VM` : res.error ?? "Failed");
    });
  }

  function handlePublish() {
    startTransition(async () => {
      const res = await publishWebsiteNow();
      setStatus(res.ok ? `Published ${res.productCount ?? 0} products` : res.error ?? "Publish failed");
    });
  }

  return (
    <Card className="mt-6 p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl">Website sync</h2>
        {config.enabled && config.apiUrl ? (
          <Badge tone={config.lastError ? "warn" : "ok"}>{config.lastError ? "Error" : "Enabled"}</Badge>
        ) : (
          <Badge tone="draft">Off</Badge>
        )}
      </div>
      <p className="mb-4 text-sm text-muted">
        Push product catalog and company details from this PC to your VM backend. The Vercel website reads from the VM
        API — nothing leaves the office except catalog data you publish.
      </p>

      <ActionForm action={saveSyncSettings} className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={config.enabled}
            className="accent-[var(--saffron,#fe7733)]"
          />
          Enable website sync
        </label>
        <Field label="VM API URL">
          <Input
            name="apiUrl"
            placeholder="https://api.yatharthafoods.in"
            defaultValue={config.apiUrl}
            required
          />
        </Field>
        <Field label="Sync secret">
          <Input name="syncSecret" type="password" defaultValue={config.syncSecret} required />
        </Field>
        <div className="md:col-span-2">
          <SubmitButton>Save sync settings</SubmitButton>
        </div>
      </ActionForm>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Last sync</dt>
          <dd className="mt-1 text-ink">{config.lastSyncAt ? formatDateTime(config.lastSyncAt) : "Never"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Products published</dt>
          <dd className="mt-1 text-ink">{config.lastProductCount || "—"}</dd>
        </div>
        {config.lastError ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Last error</dt>
            <dd className="mt-1 text-warn">{config.lastError}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={pending} onClick={handleTest}>
          Test connection
        </Button>
        <Button type="button" disabled={pending} onClick={handlePublish}>
          Publish to website
        </Button>
      </div>

      {status ? <p className="mt-3 text-sm text-muted">{status}</p> : null}
    </Card>
  );
}
