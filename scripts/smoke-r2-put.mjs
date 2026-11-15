/**
 * One-shot R2 PutObject smoke test (loads .env). Prints ok/fail only — no secrets.
 * Usage: node scripts/smoke-r2-put.mjs
 */
import { readFileSync } from "fs";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

function loadEnv() {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
const bucket = process.env.R2_BUCKET?.trim() ?? "";

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.error("FAIL: missing R2_* in .env");
  process.exit(1);
}

const key = `product-assets/_smoke-${Date.now()}.txt`;
const body = Buffer.from("yatharth-r2-smoke\n", "utf8");

async function tryPut(label, clientOpts) {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    ...clientOpts,
  });
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: "text/plain",
        ContentLength: body.length,
      }),
    );
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    console.log(`OK: ${label}`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`FAIL: ${label} -> ${msg.slice(0, 240)}`);
    return false;
  }
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

console.log(`bucket=${bucket} accountIdLen=${accountId.length} keyIdLen=${accessKeyId.length}`);

try {
  const buckets = await client.send(new ListBucketsCommand({}));
  const names = (buckets.Buckets ?? []).map((b) => b.Name).filter(Boolean);
  console.log(`ListBuckets OK count=${names.length} hasTarget=${names.includes(bucket)}`);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`ListBuckets FAIL -> ${msg.slice(0, 240)}`);
}

try {
  const listed = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }),
  );
  console.log(`ListObjects OK keyCount=${listed.KeyCount ?? 0}`);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`ListObjects FAIL -> ${msg.slice(0, 240)}`);
}

const broken = await tryPut("default checksums (current production)", {});
const fixed = await tryPut("WHEN_REQUIRED checksums (local fix)", {
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

if (!broken && fixed) {
  console.log("DIAGNOSIS: production-style client fails; checksum workaround works.");
  process.exit(0);
}
if (fixed) {
  console.log("DIAGNOSIS: fixed client works.");
  process.exit(0);
}
console.error(
  "DIAGNOSIS: R2 put still failing. If message is Access Denied, the API token is read-only — recreate it with Object Read & Write and update Vercel R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.",
);
process.exit(1);
