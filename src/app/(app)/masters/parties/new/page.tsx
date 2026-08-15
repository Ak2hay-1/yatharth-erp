import { Card, PageHeader } from "@/components/ui";
import { PartyForm } from "@/components/master-forms";
import { createParty } from "@/server/parties";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";

export default async function NewPartyPage() {
  await requireRole(MANAGEMENT);
  return (
    <div>
      <PageHeader title="New party" />
      <Card className="p-6">
        <PartyForm action={createParty} />
      </Card>
    </div>
  );
}
