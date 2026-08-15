"use client";

import { useEffect, useRef, useState } from "react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Button, Field, Input, Select } from "@/components/ui";
import { saveAutoBackup } from "@/server/auto-backup";
import { describeInterval, type AutoBackupSettings } from "@/lib/auto-backup-config";
import { formatDateTime } from "@/lib/utils";

export function AutoBackupPanel({
  settings,
  nextDue,
}: {
  settings: AutoBackupSettings;
  nextDue: string | null;
}) {
  const [path, setPath] = useState(settings.path);
  const [unit, setUnit] = useState(settings.intervalUnit);
  const [canBrowse, setCanBrowse] = useState(false);
  const intentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCanBrowse(typeof window.yatharth?.pickBackupFolder === "function");
  }, []);

  async function browse() {
    const picked = await window.yatharth?.pickBackupFolder();
    if (picked) setPath(picked);
  }

  const showClock = unit !== "hours";

  return (
    <div className="rounded-lg border border-line bg-bg p-4">
      <p className="text-sm font-semibold text-ink">Automatic backup</p>
      <p className="mt-1 text-sm text-muted">
        Copies the database into a folder you choose (USB drive, NAS, or cloud-synced folder). The
        app must be open to run. If it was closed at the scheduled time, the backup runs the next
        time you open it.
      </p>

      <ActionForm action={saveAutoBackup} className="mt-4 grid gap-4 md:grid-cols-2">
        <input ref={intentRef} type="hidden" name="intent" defaultValue="save" />
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings.enabled}
            className="accent-[var(--saffron,#fe7733)]"
          />
          Enable automatic backup
        </label>

        <Field label="Backup folder" className="md:col-span-2">
          <div className="flex flex-wrap gap-2">
            <Input
              name="path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder={`D:\\Yatharth Backups`}
              className="min-w-0 flex-1"
            />
            {canBrowse ? (
              <Button type="button" variant="secondary" onClick={browse}>
                Browse
              </Button>
            ) : null}
          </div>
        </Field>

        <Field label="Repeat every">
          <div className="flex gap-2">
            <Input
              name="intervalValue"
              type="number"
              min={1}
              max={72}
              step={1}
              defaultValue={settings.intervalValue}
              required
              className="w-24"
            />
            <Select
              name="intervalUnit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as AutoBackupSettings["intervalUnit"])}
            >
              <option value="hours">hour(s)</option>
              <option value="days">day(s)</option>
              <option value="weeks">week(s)</option>
            </Select>
          </div>
        </Field>

        <Field label={showClock ? "Run at" : "Run at (used for daily / weekly)"}>
          <Input name="time" type="time" defaultValue={settings.time} required />
        </Field>

        <div className="flex flex-wrap gap-2 md:col-span-2">
          <SubmitButton onMouseDown={() => { if (intentRef.current) intentRef.current.value = "save"; }}>
            Save schedule
          </SubmitButton>
          <SubmitButton
            variant="secondary"
            pendingLabel="Backing up…"
            onMouseDown={() => { if (intentRef.current) intentRef.current.value = "run"; }}
          >
            Backup now
          </SubmitButton>
        </div>
      </ActionForm>

      <dl className="mt-4 grid gap-1 text-sm text-muted">
        <div>
          Schedule: {settings.enabled ? describeInterval(settings) : "off"}
          {settings.enabled && settings.intervalUnit !== "hours" ? ` at ${settings.time}` : ""}
        </div>
        <div>Last backup: {formatDateTime(settings.lastAt)}</div>
        {settings.lastFile ? <div className="break-all">File: {settings.lastFile}</div> : null}
        {nextDue && settings.enabled ? <div>Next backup: {formatDateTime(nextDue)}</div> : null}
        {settings.lastError ? (
          <div className="text-bad" role="alert">
            Last error: {settings.lastError}
          </div>
        ) : null}
      </dl>
    </div>
  );
}
