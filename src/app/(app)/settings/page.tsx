import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";
import { Badge, Card, Field, Input, PageHeader, Select, Textarea, LinkButton } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { BackupRestorePanel } from "@/components/backup-restore-panel";
import { saveCompany, saveCostingDefaults } from "@/server/auth-actions";
import { nextAutoBackupDue, readAutoBackupSettings } from "@/lib/auto-backup";
import { getLicenseStatus } from "@/lib/license";
import { INDIAN_STATES, formatDateTime } from "@/lib/utils";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireRole(SUPER_ADMIN_ONLY);
  const company = await prisma.company.findUnique({ where: { id: "default" } });
  const autoBackup = await readAutoBackupSettings();
  const due = nextAutoBackupDue(autoBackup);
  const saved = (await searchParams).saved;
  const license = getLicenseStatus();
  const stateValue = company ? `${company.stateCode}|${company.state}` : "27|Maharashtra";
  return (
    <div>
      <PageHeader
        title="Company setup"
        subtitle="GSTIN and FSSAI print on every tax invoice."
        actions={
          <LinkButton href="/settings/users" variant="secondary">
            Users
          </LinkButton>
        }
      />
      {saved === "backup-run" ? (
        <p className="mb-4 text-sm text-ok">Backup written to the folder.</p>
      ) : saved === "backup" ? (
        <p className="mb-4 text-sm text-ok">Auto backup settings saved.</p>
      ) : saved ? (
        <p className="mb-4 text-sm text-ok">Saved.</p>
      ) : null}
      <Card className="p-6">
        <ActionForm action={saveCompany} className="grid gap-4 md:grid-cols-2">
          <Field label="Trade name">
            <Input name="name" required defaultValue={company?.name} />
          </Field>
          <Field label="Legal name">
            <Input name="legalName" required defaultValue={company?.legalName} />
          </Field>
          <Field label="GSTIN">
            <Input name="gstin" required defaultValue={company?.gstin} />
          </Field>
          <Field label="FSSAI">
            <Input name="fssai" required defaultValue={company?.fssai} />
          </Field>
          <Field label="Address" className="md:col-span-2">
            <Textarea name="address" required defaultValue={company?.address} />
          </Field>
          <Field label="City">
            <Input name="city" required defaultValue={company?.city} />
          </Field>
          <Field label="PIN">
            <Input name="pincode" required defaultValue={company?.pincode} />
          </Field>
          <Field label="State">
            <Select name="state" defaultValue={stateValue}>
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={`${s.code}|${s.name}`}>
                  {s.code} — {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={company?.phone} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={company?.email} />
          </Field>
          <Field label="Bank name">
            <Input name="bankName" defaultValue={company?.bankName} />
          </Field>
          <Field label="Account no">
            <Input name="bankAccount" defaultValue={company?.bankAccount} />
          </Field>
          <Field label="IFSC">
            <Input name="ifsc" defaultValue={company?.ifsc} />
          </Field>
          <div className="md:col-span-2">
            <SubmitButton>Save company</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-display mb-2 text-xl">Default rate markups</h2>
        <p className="mb-4 text-sm text-muted">
          Used on Product costing: rate = manufacturing cost × (1 + markup%). Per-SKU overrides win when set.
        </p>
        <ActionForm action={saveCostingDefaults} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="B2B / USP %">
            <Input name="markupB2bPct" type="number" step="0.1" defaultValue={company?.markupB2bPct ?? 20} />
          </Field>
          <Field label="Wholesale %">
            <Input name="markupWholesalePct" type="number" step="0.1" defaultValue={company?.markupWholesalePct ?? 25} />
          </Field>
          <Field label="Distributor %">
            <Input name="markupDistributorPct" type="number" step="0.1" defaultValue={company?.markupDistributorPct ?? 35} />
          </Field>
          <Field label="MRP %">
            <Input name="markupMrpPct" type="number" step="0.1" defaultValue={company?.markupMrpPct ?? 50} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <SubmitButton>Save markups</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <BackupRestorePanel autoBackup={autoBackup} nextDue={due ? due.toISOString() : null} />

      <Card className="mt-6 p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl">Software license</h2>
          {license.enforced ? (
            <Badge tone="ok">Licensed</Badge>
          ) : (
            <Badge tone="draft">Development</Badge>
          )}
        </div>
        <p className="mb-4 text-sm text-muted">
          {license.enforced
            ? "This copy is activated for this PC only."
            : "License lock is off while running in development."}
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">This PC</dt>
            <dd className="mt-1 break-all font-mono text-ink">{license.machineId ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Activated</dt>
            <dd className="mt-1 text-ink">
              {license.activatedAt ? formatDateTime(license.activatedAt) : license.enforced ? "—" : "Not required"}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
