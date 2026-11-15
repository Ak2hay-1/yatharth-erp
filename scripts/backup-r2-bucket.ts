/**
 * One-shot full mirror of R2_BUCKET → R2_BACKUP_BUCKET (copies every object; never deletes backup keys).
 *
 * Prerequisites: create private bucket yatharth-foods-backup and scope the R2 API token
 * to Object Read & Write on both source and backup buckets.
 *
 *   npx tsx scripts/backup-r2-bucket.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { mirrorR2BucketToBackup, r2BackupConfigured } from "../src/lib/r2-backup";

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
  if (!r2BackupConfigured()) {
    console.error(
      "R2 backup is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_BACKUP_BUCKET.",
    );
    process.exitCode = 1;
    return;
  }

  console.log("Full mirroring R2 bucket to backup…");
  const result = await mirrorR2BucketToBackup();
  console.log(
    JSON.stringify(
      {
        sourceBucket: result.sourceBucket,
        backupBucket: result.backupBucket,
        listed: result.listed,
        copied: result.copied,
        errorCount: result.errors.length,
        durationMs: result.durationMs,
      },
      null,
      2,
    ),
  );
  if (result.errors.length > 0) {
    for (const err of result.errors) {
      console.error(`  ${err.key}: ${err.message}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
