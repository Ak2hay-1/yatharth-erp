import { Card } from "@/components/ui";

export function CloudBackupsNote() {
  return (
    <Card className="mt-6 p-6">
      <h2 className="font-display text-xl text-ink">Database backups</h2>
      <p className="mt-2 text-sm text-muted">
        The cloud ERP stores all data in PostgreSQL (Neon). Point-in-time recovery and automated
        backups are managed by the database provider — not via a local .db file download.
      </p>
      <p className="mt-2 text-sm text-muted">
        For exports (reports, invoices), use the in-app Reports and print views. Contact your
        Super Admin or hosting provider to restore from a database backup if needed.
      </p>
    </Card>
  );
}
