import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";
import { flushWebsiteSyncQueue } from "@/lib/website-sync";

function isLoopback(request: Request) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  return host.startsWith("127.0.0.1:") || host.startsWith("localhost:");
}

export async function POST(request: Request) {
  if (!isLoopback(request)) {
    await requireRole(SUPER_ADMIN_ONLY);
  }
  const result = await flushWebsiteSyncQueue("scheduled");
  return NextResponse.json(result);
}
