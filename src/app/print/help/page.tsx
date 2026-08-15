import { requireUser } from "@/lib/session";
import { PrintButton } from "@/components/print-button";
import { UserManualBody } from "@/components/user-manual";

export default async function PrintHelpPage() {
  await requireUser();

  return (
    <div className="print-sheet mx-auto max-w-3xl p-6 sm:p-8">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="text-sm font-semibold text-ink">Print or save as PDF</div>
          <p className="mt-1 text-xs text-muted">
            On phone or PC: tap Print, then choose <strong>Save as PDF</strong>. Keep the file for offline use.
          </p>
        </div>
        <PrintButton label="Print / Save as PDF" />
      </div>
      <UserManualBody dense showToc />
    </div>
  );
}
