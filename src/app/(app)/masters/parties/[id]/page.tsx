import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { PartyForm } from "@/components/master-forms";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { setPartyActive, updateParty } from "@/server/parties";
import { repeatLastOrder } from "@/server/sales";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";

export default async function EditPartyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(MANAGEMENT);
  const { id } = await params;
  const party = await prisma.party.findUnique({ where: { id } });
  if (!party) notFound();
  const canReorder = party.kind === "CUSTOMER" || party.kind === "BOTH";
  return (
    <div>
      <PageHeader
        title={party.name}
        actions={
          <>
            {canReorder ? (
              <ActionForm action={repeatLastOrder.bind(null, party.id)}>
                <SubmitButton>Repeat last order</SubmitButton>
              </ActionForm>
            ) : null}
            <ActionForm action={setPartyActive.bind(null, party.id, !party.isActive)}>
              <SubmitButton variant="secondary">{party.isActive ? "Deactivate" : "Reactivate"}</SubmitButton>
            </ActionForm>
          </>
        }
      />
      <Card className="p-6">
        <PartyForm action={updateParty.bind(null, party.id)} party={party} />
      </Card>
    </div>
  );
}
