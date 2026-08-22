"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PaymentDirection, PaymentMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FINANCE } from "@/lib/permissions";
import { parseNum, requiredString, round2 } from "@/lib/utils";
import { nextNumberTx } from "@/server/numbers";

export async function recordPayment(formData: FormData) {
  await requireRole(FINANCE);
  const direction = requiredString(formData.get("direction"), "Direction") as PaymentDirection;
  const partyId = requiredString(formData.get("partyId"), "Party");
  const amount = parseNum(formData.get("amount"));
  if (amount <= 0) throw new Error("Amount must be greater than zero");
  const allocations = JSON.parse(String(formData.get("allocations") ?? "[]")) as {
    id: string;
    amount: number;
  }[];
  const allocs = allocations.filter((a) => a.id && Number(a.amount) > 0).map((a) => ({
    id: a.id,
    amount: round2(Number(a.amount)),
  }));
  const allocTotal = round2(allocs.reduce((s, a) => s + a.amount, 0));
  if (allocTotal - amount > 0.05) throw new Error("Allocations exceed payment amount");

  await prisma.$transaction(async (tx) => {
    const number = await nextNumberTx(tx, "PAY");
    const payment = await tx.payment.create({
      data: {
        number,
        direction,
        partyId,
        amount,
        date: new Date(requiredString(formData.get("date"), "Date")),
        mode: requiredString(formData.get("mode"), "Mode") as PaymentMode,
        reference: String(formData.get("reference") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      },
    });

    for (const a of allocs) {
      if (direction === "IN") {
        const inv = await tx.invoice.findUnique({ where: { id: a.id } });
        if (!inv) throw new Error("Invoice not found");
        const due = round2(inv.total - inv.paid);
        if (a.amount - due > 0.05) throw new Error(`Over-allocation on ${inv.number}`);
        await tx.paymentAllocation.create({
          data: { paymentId: payment.id, invoiceId: inv.id, amount: a.amount },
        });
        await tx.invoice.update({
          where: { id: inv.id },
          data: { paid: { increment: a.amount } },
        });
      } else {
        const bill = await tx.supplierBill.findUnique({ where: { id: a.id } });
        if (!bill) throw new Error("Bill not found");
        const due = round2(bill.total - bill.paid);
        if (a.amount - due > 0.05) throw new Error(`Over-allocation on ${bill.number}`);
        await tx.paymentAllocation.create({
          data: { paymentId: payment.id, supplierBillId: bill.id, amount: a.amount },
        });
        await tx.supplierBill.update({
          where: { id: bill.id },
          data: { paid: { increment: a.amount } },
        });
      }
    }
  });

  revalidatePath("/payments");
  redirect("/payments?saved=1");
}
