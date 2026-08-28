import { prisma } from "@/lib/prisma";

export async function readAppSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row?.value || typeof row.value !== "object") return fallback;
  return { ...fallback, ...(row.value as object) } as T;
}

export async function writeAppSetting<T extends object>(key: string, value: T): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}
