import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { ItemForm } from "@/components/master-forms";
import { updateItem } from "@/server/items";
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
      <PageHeader title={item.name} subtitle={item.sku} />
      <Card className="p-6">
        <ItemForm action={updateItem.bind(null, item.id)} item={item} />
      </Card>
    </div>
  );
}
