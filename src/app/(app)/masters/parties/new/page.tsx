import { Card, LinkButton, PageHeader } from "@/components/ui";
import { PartyForm } from "@/components/master-forms";
import { createParty } from "@/server/parties";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";

export default async function NewPartyPage({
  searchParams,
}: {
  searchParams: Promise<{ lifecycle?: string }>;
}) {
  await requireRole(MANAGEMENT);
  const sp = await searchParams;
  const seed = sp.lifecycle === "PROSPECT" ? { kind: "CUSTOMER" as const, lifecycle: "PROSPECT" as const } : undefined;
  return (
    <div>
      <PageHeader title="New party" actions={<LinkButton href="/masters/parties" variant="secondary">Cancel</LinkButton>} />
      <Card className="p-6">
        <PartyForm action={createParty} seed={seed} />
      </Card>
    </div>
  );
}
