import { NextResponse } from "next/server";
import { flushSyncQueue } from "@/server/sync";

/** Called by Electron heartbeat every 2 minutes while the app is open. */
export async function POST() {
  const result = await flushSyncQueue();
  return NextResponse.json(result);
}
