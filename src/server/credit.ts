import type { Prisma } from "@prisma/client";
import { creditLimitExceeded } from "@/lib/credit-limit";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/utils";

type Tx = Prisma.TransactionClient | typeof prisma;

export async function customerOutstanding(tx: Tx, customerId: string, excludeInvoiceId?: string) {
  const sums = await tx.invoice.aggregate({
    where: {
      customerId,
      status: "CONFIRMED",
      kind: "COMMERCIAL",
      ...(excludeInvoiceId ? { id: { not: excludeInvoiceId } } : {}),
    },
    _sum: { total: true, paid: true },
  });
  return (sums._sum.total ?? 0) - (sums._sum.paid ?? 0);
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
  if (creditLimitExceeded(customer.creditLimit, outstanding, extraAmount)) {
    throw new Error(
      `Credit limit ${money(customer.creditLimit)} exceeded for ${customer.name}. Outstanding ${money(outstanding)} plus this invoice ${money(extraAmount)}.`,
    );
  }
}
