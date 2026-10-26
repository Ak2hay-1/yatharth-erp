import { Prisma, PrismaClient } from "@prisma/client";
import { isStaleTransactionText, errorText } from "@/lib/filters";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const transactionOptions = { maxWait: 15_000, timeout: 20_000 };

/** Pooled Neon connections drop interactive transactions unless Prisma skips prepared statements. */
export function poolerDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw || !raw.includes("-pooler")) return raw;
  const q = raw.indexOf("?");
  const base = q === -1 ? raw : raw.slice(0, q);
  const params = new URLSearchParams(q === -1 ? "" : raw.slice(q + 1));
  if (!params.has("pgbouncer")) params.set("pgbouncer", "true");
  if (!params.has("connection_limit")) params.set("connection_limit", "5");
  const next = params.toString();
  return next ? `${base}?${next}` : base;
}

function createPrismaClient() {
  const url = poolerDatabaseUrl(process.env.DATABASE_URL);
  return new PrismaClient({
    transactionOptions,
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Live binding so callers keep working after restore replaces the DB file
 * and the underlying client is recreated.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    // Use the real client as receiver — Prisma delegates break if `this` is the Proxy.
    const value = Reflect.get(client, prop as string | symbol, client);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

/** Disconnect and drop the singleton so the next getPrisma() opens a fresh connection. */
export async function resetPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = undefined;
  }
  return getPrisma();
}

/** Disconnect without opening a new connection (use after restore before process settles). */
export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = undefined;
  }
}

function staleTransaction(e: unknown) {
  return isStaleTransactionText(errorText(e));
}

/**
 * Interactive transaction with an explicit timeout. A dropped Neon transaction is
 * retried once on a fresh connection; validation errors are not retried.
 */
export async function withTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  try {
    return await getPrisma().$transaction(fn, transactionOptions);
  } catch (e) {
    if (!staleTransaction(e)) throw e;
    await resetPrisma();
    return getPrisma().$transaction(fn, transactionOptions);
  }
}
