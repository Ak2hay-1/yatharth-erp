import { prisma } from "@/lib/prisma";

export async function nextNumber(prefix: string) {
  const seq = await prisma.sequence.upsert({
    where: { key: prefix },
    update: { last: { increment: 1 } },
    create: { key: prefix, last: 1 },
  });
  return `${prefix}-${String(seq.last).padStart(4, "0")}`;
}

export async function nextNumberTx(
  tx: { sequence: typeof prisma.sequence },
  prefix: string,
) {
  const seq = await tx.sequence.upsert({
    where: { key: prefix },
    update: { last: { increment: 1 } },
    create: { key: prefix, last: 1 },
  });
  return `${prefix}-${String(seq.last).padStart(4, "0")}`;
}
