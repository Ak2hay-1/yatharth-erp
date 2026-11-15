import { Card, LinkButton, PageHeader } from "@/components/ui";
import { WebsiteCatalogForm } from "@/components/website-catalog-form";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";

export default async function NewWebsiteCatalogPage() {
  await requireRole(MANAGEMENT);
  return (
    <div>
      <PageHeader
        title="Add catalog product"
        subtitle="Fill website details and upload a pack shot. Sync publishes finished SKUs to yatharthafoods.in."
        actions={
          <LinkButton href="/masters/website-catalog" variant="secondary">
            Cancel
          </LinkButton>
        }
      />
      <Card className="p-6">
        <WebsiteCatalogForm />
      </Card>
    </div>
  );
}
