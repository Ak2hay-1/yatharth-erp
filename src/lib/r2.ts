import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const R2_STORAGE_PREFIX = "r2:";

export function isR2StorageKey(storageKey: string) {
  return storageKey.startsWith(R2_STORAGE_PREFIX);
}

export function r2ObjectKey(storageKey: string) {
  return storageKey.slice(R2_STORAGE_PREFIX.length);
}

export function toR2StorageKey(objectKey: string) {
  return `${R2_STORAGE_PREFIX}${objectKey}`;
}

function r2Env() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const bucket = process.env.R2_BUCKET?.trim() ?? "";
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function r2Configured() {
  const env = r2Env();
  return Boolean(env.accountId && env.accessKeyId && env.secretAccessKey && env.bucket);
}

function r2Client() {
  const env = r2Env();
  if (!env.accountId || !env.accessKeyId || !env.secretAccessKey || !env.bucket) {
    throw new Error("Image storage is not configured.");
  }
  return {
    bucket: env.bucket,
    // AWS SDK ≥3.729 sends CRC32 checksums by default; R2 rejects those headers.
    client: new S3Client({
      region: "auto",
      endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }),
  };
}

export async function putR2Object(objectKey: string, body: Buffer, contentType: string) {
  const { client, bucket } = r2Client();
  const bytes = body instanceof Buffer ? body : Buffer.from(body);
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: bytes,
        ContentLength: bytes.length,
        ContentType: contentType || "application/octet-stream",
      }),
    );
  } catch (err) {
    const name = err && typeof err === "object" && "name" in err ? String((err as { name: unknown }).name) : "";
    const message = err instanceof Error ? err.message : String(err);
    if (/AccessDenied|Access Denied|InvalidAccessKeyId|SignatureDoesNotMatch/i.test(`${name} ${message}`)) {
      throw new Error(
        "R2 credentials cannot write to the bucket. In Cloudflare R2, create an API token with Object Read & Write on this bucket, then update R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY on the ERP Vercel project.",
      );
    }
    throw err instanceof Error ? err : new Error(message);
  }
}

export async function getR2Object(objectKey: string): Promise<Buffer> {
  const { client, bucket } = r2Client();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }),
  );
  if (!result.Body) throw new Error("File missing in image storage.");
  return Buffer.from(await result.Body.transformToByteArray());
}

export async function deleteR2Object(objectKey: string) {
  const { client, bucket } = r2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }),
  );
}

/** Browser uploads directly to R2 (avoids Cloudflare→Vercel multipart 502s). */
export async function createR2PresignedPutUrl(objectKey: string, contentType: string, expiresIn = 120) {
  const { client, bucket } = r2Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: contentType || "application/octet-stream",
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  return { uploadUrl, bucket, objectKey, storageKey: toR2StorageKey(objectKey) };
}

/** Server-mediated chunked upload (no browser CORS; each part stays under Vercel body limits). */
export async function startR2MultipartUpload(objectKey: string, contentType: string) {
  const { client, bucket } = r2Client();
  const result = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: contentType || "application/octet-stream",
    }),
  );
  if (!result.UploadId) throw new Error("Could not start multipart upload.");
  return { uploadId: result.UploadId, objectKey, storageKey: toR2StorageKey(objectKey) };
}

export async function uploadR2MultipartPart(
  objectKey: string,
  uploadId: string,
  partNumber: number,
  body: Buffer,
) {
  const { client, bucket } = r2Client();
  const result = await client.send(
    new UploadPartCommand({
      Bucket: bucket,
      Key: objectKey,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: body,
      ContentLength: body.length,
    }),
  );
  if (!result.ETag) throw new Error(`Part ${partNumber} upload failed.`);
  return { etag: result.ETag, partNumber };
}

export async function completeR2MultipartUpload(
  objectKey: string,
  uploadId: string,
  parts: Array<{ partNumber: number; etag: string }>,
) {
  const { client, bucket } = r2Client();
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: objectKey,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .slice()
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((p) => ({ ETag: p.etag, PartNumber: p.partNumber })),
      },
    }),
  );
}

export async function abortR2MultipartUpload(objectKey: string, uploadId: string) {
  const { client, bucket } = r2Client();
  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: objectKey,
      UploadId: uploadId,
    }),
  );
}
