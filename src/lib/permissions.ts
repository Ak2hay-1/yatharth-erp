import type { Role } from "@prisma/client";

/** Day-to-day ops: purchase, GRN, production, sales, stock. */
export const OPS: Role[] = ["SUPER_ADMIN", "ADMIN", "STAFF"];

/** Finance: supplier bills, payments, reports. */
export const FINANCE: Role[] = ["SUPER_ADMIN", "ADMIN"];

/** Masters create/edit (items, parties, recipes) and company-wide management. */
export const MANAGEMENT: Role[] = ["SUPER_ADMIN", "ADMIN"];

export const ALL_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "STAFF"];

/** Company settings and manual user creation. */
export const SUPER_ADMIN_ONLY: Role[] = ["SUPER_ADMIN"];

/** Roles a super admin may assign when creating accounts. */
export const ASSIGNABLE_ROLES: Role[] = ["ADMIN", "STAFF", "SUPER_ADMIN"];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  STAFF: "Staff",
};

const LEGACY_ROLES: Record<string, Role> = {
  OWNER: "SUPER_ADMIN",
  OFFICE: "STAFF",
  ACCOUNTANT: "ADMIN",
};

/** Map JWT/DB strings (including pre-seed OWNER/OFFICE) onto current Role values. */
export function normalizeRole(role: string | Role | null | undefined): Role {
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "STAFF") return role;
  if (role && LEGACY_ROLES[role]) return LEGACY_ROLES[role];
  return "SUPER_ADMIN";
}

export function can(role: string | Role, allowed: Role[]) {
  return allowed.includes(normalizeRole(role));
}

export function roleLabel(role: string | Role) {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized] ?? normalized;
}
