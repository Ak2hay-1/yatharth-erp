/**
 * Soft-archive QA TEST masters after a DB backup.
 *
 * 1. Take a Neon backup / branch (or pg_dump) BEFORE running this.
 * 2. Dry-run:  npx tsx scripts/archive-qa-test.ts
 * 3. Apply:    npx tsx scripts/archive-qa-test.ts --apply
 * 4. Settings → Website sync → Publish so the public catalogue drops inactive SKUs.
 *
 * Matches names/SKUs containing "QA TEST" or "QA_TEST" (case-insensitive).
 * Items → isActive=false; Parties → INACTIVE + isActive=false.
 * Confirmed/cancelled documents are left in place for audit.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const PATTERN = /(QA[\s_]?TEST)/i;

function loadDotEnv() {
  const file = path.join(process.cwd(), ".env");
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function isQaTest(...parts: Array<string | null | undefined>) {
  return parts.some((p) => p && PATTERN.test(p));
}

async function main() {
  loadDotEnv();
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient();

  try {
    const [items, parties] = await Promise.all([
      prisma.item.findMany({
        where: { isActive: true },
        select: { id: true, sku: true, name: true, type: true },
      }),
      prisma.party.findMany({
        where: { isActive: true },
        select: { id: true, name: true, kind: true, lifecycle: true },
      }),
    ]);

    const qaItems = items.filter((i) => isQaTest(i.sku, i.name));
    const qaParties = parties.filter((p) => isQaTest(p.name));

    console.log(`Found ${qaItems.length} active QA TEST item(s), ${qaParties.length} active QA TEST party(ies).`);
    for (const i of qaItems) console.log(`  item  ${i.sku} · ${i.name} (${i.type})`);
    for (const p of qaParties) console.log(`  party ${p.kind} · ${p.name}`);

    if (!apply) {
      console.log("\nDry-run only. Re-run with --apply after backup to soft-archive.");
      return;
    }

    if (qaItems.length === 0 && qaParties.length === 0) {
      console.log("Nothing to archive.");
      return;
    }

    const [itemResult, partyResult] = await prisma.$transaction([
      prisma.item.updateMany({
        where: { id: { in: qaItems.map((i) => i.id) } },
        data: { isActive: false },
      }),
      prisma.party.updateMany({
        where: { id: { in: qaParties.map((p) => p.id) } },
        data: { isActive: false, lifecycle: "INACTIVE" },
      }),
    ]);

    console.log(`Archived ${itemResult.count} item(s), ${partyResult.count} party(ies).`);
    console.log("Next: Settings → Website sync → Publish to website.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
