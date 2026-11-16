/**
 * Set CORS on R2_BUCKET so browser presigned PUTs from the ERP work.
 * Usage: node scripts/set-r2-cors.mjs
 */
import { readFileSync } from "fs";
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

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

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const corsRules = [
  {
    AllowedOrigins: ["https://erp.yatharthafoods.in", "http://localhost:3000"],
    AllowedMethods: ["GET", "PUT", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag", "Content-Type"],
    MaxAgeSeconds: 3600,
  },
];

try {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: { CORSRules: corsRules },
    }),
  );
  console.log(`OK: PutBucketCors on ${bucket}`);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`FAIL: PutBucketCors -> ${msg.slice(0, 300)}`);
  process.exit(1);
}

try {
  const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log("Current CORS:", JSON.stringify(current.CORSRules ?? [], null, 2));
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`WARN: GetBucketCors -> ${msg.slice(0, 300)}`);
}
