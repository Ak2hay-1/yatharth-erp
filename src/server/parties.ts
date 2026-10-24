"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BuyerCluster, CustomerChannel, PartyKind, PartyLifecycle } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { MANAGEMENT } from "@/lib/permissions";
import { parseNum, requireCalendarDate, requiredString } from "@/lib/utils";
import { runAction } from "@/lib/run-action";

function partyData(formData: FormData) {
  const kind = requiredString(formData.get("kind"), "Kind") as PartyKind;
  const channelRaw = String(formData.get("channel") ?? "");
  const state = String(formData.get("state") ?? "");
  const [stateCode, ...rest] = state.split("|");
  const lifecycleRaw = (String(formData.get("lifecycle") || "CUSTOMER") as PartyLifecycle);
  const supplierOnly = kind === "SUPPLIER";
  const lifecycle: PartyLifecycle = supplierOnly ? "CUSTOMER" : lifecycleRaw;
  const creditLimit = supplierOnly || lifecycle === "PROSPECT" ? 0 : parseNum(formData.get("creditLimit"));
  const isActive = supplierOnly
    ? formData.get("supplierActive") !== "false"
    : lifecycle !== "INACTIVE";
  const nextReorder = String(formData.get("nextReorderDate") ?? "");
  return {
    name: requiredString(formData.get("name"), "Name"),
    kind,
    channel: kind === "SUPPLIER" ? null : ((channelRaw || "B2B") as CustomerChannel),
    cluster: kind === "SUPPLIER" ? "NONE" as const : ((String(formData.get("cluster") || "NONE") as BuyerCluster)),
    lifecycle,
    gstin: String(formData.get("gstin") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    billingAddress: String(formData.get("billingAddress") ?? ""),
    shippingAddress: String(formData.get("shippingAddress") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: rest.join("|") || stateCode,
    stateCode,
    pincode: String(formData.get("pincode") ?? ""),
    creditLimit,
    paymentTermsDays: Math.round(parseNum(formData.get("paymentTermsDays"), 30)),
    reorderCycleDays: Math.round(parseNum(formData.get("reorderCycleDays"), 30)),
    nextReorderDate: nextReorder ? requireCalendarDate(nextReorder, "Next reorder date") : null,
    lostReason: String(formData.get("lostReason") ?? ""),
    isActive,
  };
}

export async function createParty(formData: FormData) {
  return runAction(async () => {
  await requireRole(MANAGEMENT);
  await prisma.party.create({ data: partyData(formData) });
  revalidatePath("/masters/parties");
  redirect("/masters/parties");
  });
}

/** Create a party and return it (for inline creatable pickers). Does not redirect. */
export async function createPartyQuick(formData: FormData) {
  return runAction(async () => {
  await requireRole(MANAGEMENT);
  const data = partyData(formData);
  const party = await prisma.party.create({ data });
  revalidatePath("/masters/parties");
  return {
    id: party.id,
    name: party.name,
    kind: party.kind,
    phone: party.phone,
    city: party.city,
  };
  });
}

export async function updateParty(id: string, formData: FormData) {
  return runAction(async () => {
  await requireRole(MANAGEMENT);
  await prisma.party.update({ where: { id }, data: partyData(formData) });
  revalidatePath("/masters/parties");
  redirect("/masters/parties");
  });
}

export async function setPartyActive(id: string, active: boolean) {
  return runAction(async () => {
    await requireRole(MANAGEMENT);
    const party = await prisma.party.findUnique({ where: { id } });
    if (!party) throw new Error("Party not found");
    await prisma.party.update({
      where: { id },
      data: {
        isActive: active,
        lifecycle: party.kind === "SUPPLIER" ? party.lifecycle : active ? (party.lifecycle === "INACTIVE" ? "CUSTOMER" : party.lifecycle) : "INACTIVE",
      },
    });
    revalidatePath(`/masters/parties/${id}`);
    revalidatePath("/masters/parties");
  });
}
