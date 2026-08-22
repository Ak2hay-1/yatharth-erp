import { PageHeader } from "@/components/ui";
import { UserManualActions, UserManualBody } from "@/components/user-manual";

export default function HelpPage() {
  return (
    <div>
      <PageHeader
        title="Help & user manual"
        subtitle="Plain steps for new users — buy, make, sell, money, and quality. Save a PDF for your phone."
        actions={<UserManualActions />}
      />
      <div className="rounded-xl border border-line bg-card p-6 shadow-[0_1px_0_rgba(35,38,44,0.04)] sm:p-8">
        <UserManualBody />
      </div>
    </div>
  );
}
