import { CopyObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { r2Configured } from "@/lib/r2";

function r2BackupEnv() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const sourceBucket = process.env.R2_BUCKET?.trim() ?? "";
  const backupBucket = process.env.R2_BACKUP_BUCKET?.trim() ?? "";
  return { accountId, accessKeyId, secretAccessKey, sourceBucket, backupBucket };
}

export function r2BackupConfigured() {
  const env = r2BackupEnv();
  return Boolean(r2Configured() && env.backupBucket);
}

function backupClient() {
  const env = r2BackupEnv();
  if (
    !env.accountId ||
    !env.accessKeyId ||
    !env.secretAccessKey ||
    !env.sourceBucket ||
    !env.backupBucket
  ) {
    throw new Error(
      "R2 backup is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_BACKUP_BUCKET.",
    );
  }
  return {
    sourceBucket: env.sourceBucket,
    backupBucket: env.backupBucket,
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

export async function listR2ObjectKeys(bucket: string): Promise<string[]> {
  const { client } = backupClient();
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      }),
    );
    for (const item of page.Contents ?? []) {
      if (!item.Key) continue;
      keys.push(item.Key);
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

export async function copyR2Object(params: {
  sourceBucket: string;
  destBucket: string;
  key: string;
}) {
  const { client } = backupClient();
  const copySource = `${params.sourceBucket}/${params.key.split("/").map(encodeURIComponent).join("/")}`;
  await client.send(
    new CopyObjectCommand({
      Bucket: params.destBucket,
      Key: params.key,
      CopySource: copySource,
    }),
  );
}

export type R2MirrorResult = {
  sourceBucket: string;
  backupBucket: string;
  listed: number;
  copied: number;
  errors: Array<{ key: string; message: string }>;
  durationMs: number;
};

/**
 * Full mirror of R2_BUCKET into R2_BACKUP_BUCKET under the same keys.
 * Copies every object on every run; never deletes keys from the backup bucket.
 */
export async function mirrorR2BucketToBackup(): Promise<R2MirrorResult> {
  const started = Date.now();
  const { sourceBucket, backupBucket } = backupClient();

  const sourceKeys = await listR2ObjectKeys(sourceBucket);
  let copied = 0;
  const errors: Array<{ key: string; message: string }> = [];

  for (const key of sourceKeys) {
    try {
      await copyR2Object({
        sourceBucket,
        destBucket: backupBucket,
        key,
      });
      copied += 1;
    } catch (error) {
      errors.push({
        key,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    sourceBucket,
    backupBucket,
    listed: sourceKeys.length,
    copied,
    errors,
    durationMs: Date.now() - started,
  };
}
