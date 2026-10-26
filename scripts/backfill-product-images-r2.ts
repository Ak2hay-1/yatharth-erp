/**
 * Upload seeded flyer photos to Cloudflare R2 and point ProductAsset rows at them.
 *
 * Run once, with R2_* and DATABASE_URL set (values already in .env are loaded):
 *   npx tsx scripts/backfill-product-images-r2.ts
 */
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { putR2Object, r2Configured, toR2StorageKey } from "../src/lib/r2";

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

async function main() {
  loadDotEnv();
  if (!r2Configured()) {
    throw new Error(
      "Image storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.",
    );
  }

  const prisma = new PrismaClient();
  const refDir = path.join(process.cwd(), "media", "product-refs");
  const files = readdirSync(refDir).filter((name) => name.toLowerCase().endsWith(".jpg"));
  let updated = 0;

  try {
    for (const fileName of files) {
      const sku = path.basename(fileName, path.extname(fileName));
      const storageKey = `seed-${sku.toLowerCase()}.jpg`;
      const rows = await prisma.productAsset.findMany({ where: { storageKey } });
      if (!rows.length) {
        console.log(`skip ${fileName}: no product asset with ${storageKey}`);
        continue;
      }
      const bytes = readFileSync(path.join(refDir, fileName));
      for (const row of rows) {
        const objectKey = `product-assets/${Date.now()}-${randomBytes(8).toString("hex")}.jpg`;
        await putR2Object(objectKey, bytes, "image/jpeg");
        await prisma.productAsset.update({
          where: { id: row.id },
          data: {
            storageKey: toR2StorageKey(objectKey),
            mimeType: "image/jpeg",
            sizeBytes: bytes.length,
          },
        });
        updated += 1;
        console.log(`uploaded ${fileName} -> ${objectKey} (${row.id})`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`Updated ${updated} product image(s).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
