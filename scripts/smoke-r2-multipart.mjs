import { readFileSync } from "fs";
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

function loadEnv() {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(m[1].trim() in process.env)) process.env[m[1].trim()] = val;
  }
}
loadEnv();

const accountId = process.env.R2_ACCOUNT_ID.trim();
const bucket = process.env.R2_BUCKET.trim();
const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const key = `product-assets/_smoke-mp-${Date.now()}.bin`;
const body = Buffer.alloc(64 * 1024, 7);

const created = await client.send(
  new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: "application/octet-stream" }),
);
const uploadId = created.UploadId;
const part = await client.send(
  new UploadPartCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    PartNumber: 1,
    Body: body,
    ContentLength: body.length,
  }),
);
await client.send(
  new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: [{ ETag: part.ETag, PartNumber: 1 }] },
  }),
);
await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
console.log("OK: single-part multipart upload works");
