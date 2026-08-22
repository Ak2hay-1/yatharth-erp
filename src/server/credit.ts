import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/utils";

type Tx = Prisma.TransactionClient | typeof prisma;

export async function customerOutstanding(tx: Tx, customerId: string, excludeInvoiceId?: string) {
  const invoices = await tx.invoice.findMany({
    where: {
      customerId,
      status: "CONFIRMED",
      kind: "COMMERCIAL",
      ...(excludeInvoiceId ? { id: { not: excludeInvoiceId } } : {}),
    },
    select: { total: true, paid: true },
  });
  return invoices.reduce((s, i) => s + (i.total - i.paid), 0);
}

export async function assertCreditOk(
  tx: Tx,
  customerId: string,
  extraAmount: number,
  excludeInvoiceId?: string,
) {
  const customer = await tx.party.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Customer not found");
  if (customer.creditLimit <= 0) return;

  const outstanding = await customerOutstanding(tx, customerId, excludeInvoiceId);
  const projected = outstanding + extraAmount;
  if (projected - customer.creditLimit > 0.009) {
    throw new Error(
      `Credit limit ${money(customer.creditLimit)} exceeded for ${customer.name}. Outstanding ${money(outstanding)} plus this invoice ${money(extraAmount)}.`,
    );
  }
}
