import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";
import { mirrorR2BucketToBackup, r2BackupConfigured } from "@/lib/r2-backup";

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    await requireRole(SUPER_ADMIN_ONLY);
  }

  if (!r2BackupConfigured()) {
    return NextResponse.json(
      {
        error:
          "R2 backup is not configured. Set R2_BACKUP_BUCKET (and the existing R2_* vars).",
      },
      { status: 503 },
    );
  }

  const result = await mirrorR2BucketToBackup();
  const status = result.errors.length > 0 ? 207 : 200;
  return NextResponse.json(result, { status });
}

export async function GET(request: Request) {
  return POST(request);
}
