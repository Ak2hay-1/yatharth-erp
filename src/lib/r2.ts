import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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
    client: new S3Client({
      region: "auto",
      endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
    }),
  };
}

export async function putR2Object(objectKey: string, body: Buffer, contentType: string) {
  const { client, bucket } = r2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    }),
  );
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
