import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";
import { flushWebsiteSyncQueue } from "@/lib/website-sync";

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
  const result = await flushWebsiteSyncQueue("scheduled");
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
