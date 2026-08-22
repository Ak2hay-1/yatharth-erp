import { Card, PageHeader } from "@/components/ui";
import { ItemForm } from "@/components/master-forms";
import { createItem } from "@/server/items";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";

export default async function NewItemPage() {
  await requireRole(MANAGEMENT);
  return (
    <div>
      <PageHeader title="New item" subtitle="Add a raw, packing or finished SKU." />
      <Card className="p-6">
        <ItemForm action={createItem} />
      </Card>
    </div>
  );
}
