"use client";

import { useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Button, Card } from "@/components/ui";

type Status = { kind: "idle" } | { kind: "busy"; message: string } | { kind: "error"; message: string };

async function downloadCurrentBackup(): Promise<void> {
  const res = await fetch("/api/backup");
  if (!res.ok) {
    throw new Error("Could not download a safety backup of the current database.");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const name = match?.[1] ?? `yatharth-safety-backup-${Date.now()}.db`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function BackupRestorePanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleDownload() {
    setStatus({ kind: "busy", message: "Preparing backup…" });
    try {
      await downloadCurrentBackup();
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Download failed.",
      });
    }
  }

  async function handleRestore() {
    if (!file) {
      setStatus({ kind: "error", message: "Choose a .db backup file first." });
      return;
    }

    const ok = window.confirm(
      "Restore will REPLACE ALL current data with this backup.\n\n" +
        "A safety copy of the current database will download first.\n\n" +
        "After restore, sign in with an account that existed in that backup.\n\n" +
        "Continue?",
    );
    if (!ok) return;

    setStatus({ kind: "busy", message: "Downloading safety backup of current data…" });
    try {
      await downloadCurrentBackup();

      setStatus({ kind: "busy", message: "Restoring database…" });
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/backup/restore", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        throw new Error(data.error ?? "Restore failed.");
      }

      setStatus({
        kind: "busy",
        message: "Restore complete. Signing out and reloading…",
      });
      // Clear JWT and do a full navigation so the next login opens a fresh DB connection.
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Restore failed.",
      });
    }
  }

  const busy = status.kind === "busy";

  return (
    <Card className="mt-6 p-6">
      <h2 className="font-display text-xl text-ink">Backup &amp; restore</h2>
      <p className="mt-1 text-sm text-muted">
        Offline backup is a full copy of the SQLite database (all masters, stock, documents, users,
        and settings). Restore replaces the entire live system with that file.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={busy} onClick={handleDownload}>
          Download backup
        </Button>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-bg p-4">
        <p className="text-sm font-semibold text-ink">Restore from backup</p>
        <p className="mt-1 text-sm text-muted">
          Before restore, the app automatically downloads a safety backup of the current database.
          Afterward you must sign in with an account from the restored backup (not necessarily your
          latest password if the backup is older).
        </p>
        <div className="mt-3">
          <input
            ref={inputRef}
            type="file"
            accept=".db,application/octet-stream"
            disabled={busy}
            className="block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink hover:file:bg-bg"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setStatus({ kind: "idle" });
            }}
          />
        </div>
        <div className="mt-3">
          <Button type="button" variant="danger" disabled={busy || !file} onClick={handleRestore}>
            Restore backup
          </Button>
        </div>
      </div>

      {status.kind === "busy" ? (
        <p className="mt-3 text-sm text-muted" role="status">
          {status.message}
        </p>
      ) : null}
      {status.kind === "error" ? (
        <p className="mt-3 text-sm text-bad" role="alert">
          {status.message}
        </p>
      ) : null}
    </Card>
  );
}
