"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { hash } from "bcryptjs";
import type { Role } from "@prisma/client";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireLicense, requireRole, requireUser } from "@/lib/session";
import { ASSIGNABLE_ROLES, SUPER_ADMIN_ONLY } from "@/lib/permissions";
import { rethrowRedirect, requiredString } from "@/lib/utils";

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  requireLicense();
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/dashboard",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      // Only credential failures should look like a bad password; other AuthErrors
      // (config/CSRF) were previously mislabeled the same way after restore.
      if (e.type === "CredentialsSignin") {
        return { error: "Invalid email or password" };
      }
      return { error: "Sign-in failed. Try again, or restart the app if you just restored a backup." };
    }
    rethrowRedirect(e);
    throw e;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function saveCompany(formData: FormData) {
  await requireRole(SUPER_ADMIN_ONLY);
  const state = requiredString(formData.get("state"), "State");
  const [stateCode, ...rest] = state.split("|");
  await prisma.company.upsert({
    where: { id: "default" },
    update: {
      name: requiredString(formData.get("name"), "Name"),
      legalName: requiredString(formData.get("legalName"), "Legal name"),
      gstin: requiredString(formData.get("gstin"), "GSTIN"),
      fssai: requiredString(formData.get("fssai"), "FSSAI"),
      address: requiredString(formData.get("address"), "Address"),
      city: requiredString(formData.get("city"), "City"),
      state: rest.join("|") || stateCode,
      stateCode,
      pincode: requiredString(formData.get("pincode"), "PIN"),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      bankName: String(formData.get("bankName") ?? ""),
      bankAccount: String(formData.get("bankAccount") ?? ""),
      ifsc: String(formData.get("ifsc") ?? ""),
    },
    create: {
      id: "default",
      name: requiredString(formData.get("name"), "Name"),
      legalName: requiredString(formData.get("legalName"), "Legal name"),
      gstin: requiredString(formData.get("gstin"), "GSTIN"),
      fssai: requiredString(formData.get("fssai"), "FSSAI"),
      address: requiredString(formData.get("address"), "Address"),
      city: requiredString(formData.get("city"), "City"),
      state: rest.join("|") || stateCode,
      stateCode,
      pincode: requiredString(formData.get("pincode"), "PIN"),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      bankName: String(formData.get("bankName") ?? ""),
      bankAccount: String(formData.get("bankAccount") ?? ""),
      ifsc: String(formData.get("ifsc") ?? ""),
    },
  });
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function createUser(formData: FormData) {
  await requireRole(SUPER_ADMIN_ONLY);
  const email = requiredString(formData.get("email"), "Email").toLowerCase();
  const role = requiredString(formData.get("role"), "Role") as Role;
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new Error("Invalid role");
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email already exists");
  await prisma.user.create({
    data: {
      name: requiredString(formData.get("name"), "Name"),
      email,
      passwordHash: await hash(requiredString(formData.get("password"), "Password"), 10),
      role,
    },
  });
  revalidatePath("/settings/users");
  redirect("/settings/users");
}

export async function updateUser(id: string, formData: FormData) {
  const actor = await requireRole(SUPER_ADMIN_ONLY);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found");

  const role = requiredString(formData.get("role"), "Role") as Role;
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new Error("Invalid role");
  }
  const active = formData.get("active") === "on" || formData.get("active") === "true";
  if (user.id === actor.id && !active) {
    throw new Error("You cannot deactivate your own account.");
  }

  const password = String(formData.get("password") ?? "").trim();
  await prisma.user.update({
    where: { id },
    data: {
      name: requiredString(formData.get("name"), "Name"),
      role,
      active,
      ...(password.length >= 8 ? { passwordHash: await hash(password, 10) } : {}),
    },
  });
  revalidatePath("/settings/users");
  redirect("/settings/users");
}

export async function toggleUserActive(id: string) {
  const actor = await requireRole(SUPER_ADMIN_ONLY);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found");
  if (user.id === actor.id) throw new Error("You cannot deactivate your own account.");
  await prisma.user.update({ where: { id }, data: { active: !user.active } });
  revalidatePath("/settings/users");
}

export async function saveCostingDefaults(formData: FormData) {
  await requireRole(SUPER_ADMIN_ONLY);
  await prisma.company.update({
    where: { id: "default" },
    data: {
      markupB2bPct: parseFloat(String(formData.get("markupB2bPct") ?? "20")) || 0,
      markupWholesalePct: parseFloat(String(formData.get("markupWholesalePct") ?? "25")) || 0,
      markupDistributorPct: parseFloat(String(formData.get("markupDistributorPct") ?? "35")) || 0,
      markupMrpPct: parseFloat(String(formData.get("markupMrpPct") ?? "50")) || 0,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/masters/costing");
  redirect("/settings?saved=1");
}

export async function getCompany() {
  await requireUser();
  return prisma.company.findUnique({ where: { id: "default" } });
}
