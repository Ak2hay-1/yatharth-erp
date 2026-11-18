/**
 * One-time data fixes for retest findings 5, 6, 8, 9, 10.
 *
 * Dry-run:  npx tsx scripts/fix-retest-data.ts
 * Apply:    npx tsx scripts/fix-retest-data.ts --apply
 *
 * Also soft-archives QA TEST masters when --apply is set (same as archive-qa-test.ts).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, type ProductLane, type VegMark } from "@prisma/client";

const QA_PATTERN = /(QA[\s_]?TEST)/i;
const RM_NAME_PATTERN = /milk\s*powder|maida|kasoori\s*methi/i;
const SUPPLIER_NAMES = [/deccan\s*poultry/i, /green\s*valley\s*farms/i];
const CHEESE_BALLS = /chicken\s*cheese\s*balls/i;

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

function vegFromLane(lane: ProductLane, sku: string, name: string): VegMark {
  if (lane === "CHICKEN") return "NON_VEG";
  if (lane === "POTATO" || lane === "GRAVY" || lane === "SNACKS" || lane === "CUSTOM") return "VEG";
  const text = `${sku} ${name}`.toLowerCase();
  if (/chk|chicken|non[\s-]?veg|meat|poultry/.test(text)) return "NON_VEG";
  if (/veg|aloo|potato|corn|paneer|pav\s*bhaji|methi/.test(text)) return "VEG";
  return "NA";
}

async function main() {
  loadDotEnv();
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient();

  try {
    const finished = await prisma.item.findMany({
      where: { type: "FINISHED" },
      select: {
        id: true,
        sku: true,
        name: true,
        lane: true,
        websiteDescription: true,
        label: { select: { id: true, vegNonVeg: true } },
      },
    });

    const needVeg = finished.filter(
      (i) => !i.label || i.label.vegNonVeg === "NA",
    );
    const cheeseBalls = finished.filter((i) => CHEESE_BALLS.test(i.name));
    const misTypedRm = await prisma.item.findMany({
      where: { type: "FINISHED", name: { contains: "" } },
      select: { id: true, sku: true, name: true, type: true },
    });
    const rmFixes = misTypedRm.filter((i) => RM_NAME_PATTERN.test(i.name));

    const parties = await prisma.party.findMany({
      select: { id: true, name: true, kind: true, lifecycle: true, isActive: true },
    });
    const supplierFixes = parties.filter(
      (p) => SUPPLIER_NAMES.some((re) => re.test(p.name)) && p.kind !== "SUPPLIER",
    );
    const qaItems = await prisma.item.findMany({
      where: { isActive: true },
      select: { id: true, sku: true, name: true },
    });
    const qaParties = parties.filter((p) => p.isActive && QA_PATTERN.test(p.name));
    const qaItemHits = qaItems.filter((i) => QA_PATTERN.test(i.sku) || QA_PATTERN.test(i.name));

    console.log(`Veg labels to set: ${needVeg.length}`);
    for (const i of needVeg.slice(0, 25)) {
      console.log(`  ${i.sku} · ${i.name} → ${vegFromLane(i.lane, i.sku, i.name)}`);
    }
    console.log(`Reclassify as RAW: ${rmFixes.length}`);
    for (const i of rmFixes) console.log(`  ${i.sku} · ${i.name}`);
    console.log(`Supplier kind fixes: ${supplierFixes.length}`);
    for (const p of supplierFixes) console.log(`  ${p.name} (${p.kind})`);
    console.log(`Cheese balls description: ${cheeseBalls.length}`);
    console.log(`QA TEST items to archive: ${qaItemHits.length}, parties: ${qaParties.length}`);

    if (!apply) {
      console.log("\nDry-run only. Re-run with --apply after backup.");
      return;
    }

    for (const i of needVeg) {
      const vegNonVeg = vegFromLane(i.lane, i.sku, i.name);
      if (vegNonVeg === "NA") continue;
      await prisma.itemLabel.upsert({
        where: { itemId: i.id },
        create: { itemId: i.id, vegNonVeg },
        update: { vegNonVeg },
      });
    }

    if (rmFixes.length) {
      await prisma.item.updateMany({
        where: { id: { in: rmFixes.map((i) => i.id) } },
        data: { type: "RAW" },
      });
    }

    for (const p of supplierFixes) {
      await prisma.party.update({
        where: { id: p.id },
        data: { kind: "SUPPLIER", lifecycle: "CUSTOMER" },
      });
    }

    const cheeseBlurb =
      "Frozen chicken cheese balls for restaurants, cafes, hotels and distributors. Packed for consistent taste and cold-chain supply from our Pune plant.";
    for (const i of cheeseBalls) {
      if (i.websiteDescription?.trim()) continue;
      await prisma.item.update({
        where: { id: i.id },
        data: { websiteDescription: cheeseBlurb },
      });
    }

    if (qaItemHits.length) {
      await prisma.item.updateMany({
        where: { id: { in: qaItemHits.map((i) => i.id) } },
        data: { isActive: false },
      });
    }
    if (qaParties.length) {
      await prisma.party.updateMany({
        where: { id: { in: qaParties.map((p) => p.id) } },
        data: { isActive: false, lifecycle: "INACTIVE" },
      });
    }

    console.log("Applied. Publish website catalog from Settings so the storefront picks up veg/description changes.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
