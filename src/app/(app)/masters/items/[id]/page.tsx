import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { ItemForm } from "@/components/master-forms";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { setItemActive, updateItem } from "@/server/items";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(MANAGEMENT);
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) notFound();
  return (
    <div>
      <PageHeader
        title={item.name}
        subtitle={item.sku}
        actions={
          <ActionForm action={setItemActive.bind(null, item.id, !item.isActive)}>
            <SubmitButton variant="secondary">{item.isActive ? "Deactivate" : "Reactivate"}</SubmitButton>
          </ActionForm>
        }
      />
      <Card className="p-6">
        <ItemForm action={updateItem.bind(null, item.id)} item={item} />
      </Card>
    </div>
  );
}
