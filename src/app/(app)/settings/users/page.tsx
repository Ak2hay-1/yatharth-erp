import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { roleLabel, SUPER_ADMIN_ONLY } from "@/lib/permissions";
import { Card, Field, Input, PageHeader, Select, Table, Td, Th, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { createUser, toggleUserActive, updateUser } from "@/server/auth-actions";
import { formatDate } from "@/lib/utils";

export default async function UsersPage() {
  await requireRole(SUPER_ADMIN_ONLY);
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Accounts are created manually here. There is no public sign-up."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <Card className="p-2">
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Since</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <Td>{u.name}</Td>
                    <Td>{u.email}</Td>
                    <Td>{roleLabel(u.role)}</Td>
                    <Td>
                      {u.active ? <Badge tone="ok">Active</Badge> : <Badge tone="bad">Inactive</Badge>}
                    </Td>
                    <Td>{formatDate(u.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          {users.map((u) => (
            <Card key={u.id} className="p-6">
              <h2 className="font-display mb-3 text-lg">{u.name}</h2>
              <p className="mb-3 text-sm text-muted">{u.email}</p>
              <ActionForm action={updateUser.bind(null, u.id)} className="space-y-3">
                <Field label="Name">
                  <Input name="name" required defaultValue={u.name} />
                </Field>
                <Field label="Role">
                  <Select name="role" defaultValue={u.role}>
                    <option value="STAFF">Staff — day-to-day ops</option>
                    <option value="ADMIN">Admin — ops + finance</option>
                    <option value="SUPER_ADMIN">Super Admin — full access</option>
                  </Select>
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={u.active}
                    className="accent-[var(--saffron,#fe7733)]"
                  />
                  Active (can sign in)
                </label>
                <Field label="New password (optional, min 8 chars)">
                  <Input name="password" type="password" minLength={8} placeholder="Leave blank to keep" />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <SubmitButton>Save user</SubmitButton>
                </div>
              </ActionForm>
              <ActionForm action={toggleUserActive.bind(null, u.id)} className="mt-3">
                <SubmitButton>{u.active ? "Deactivate quickly" : "Reactivate quickly"}</SubmitButton>
              </ActionForm>
            </Card>
          ))}
        </div>

        <Card className="h-fit p-6">
          <h2 className="font-display mb-4 text-xl">Create account</h2>
          <p className="mb-4 text-sm text-muted">Only Super Admin can create Admin or Staff logins.</p>
          <ActionForm action={createUser} className="space-y-3">
            <Field label="Name">
              <Input name="name" required />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" required minLength={8} />
            </Field>
            <Field label="Role">
              <Select name="role" defaultValue="STAFF">
                <option value="STAFF">Staff — day-to-day ops</option>
                <option value="ADMIN">Admin — ops + finance</option>
                <option value="SUPER_ADMIN">Super Admin — full access</option>
              </Select>
            </Field>
            <SubmitButton>Create user</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
