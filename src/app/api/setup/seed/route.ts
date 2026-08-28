import { NextResponse } from "next/server";
import { seedDatabase } from "../../../../../prisma/seed";

export const runtime = "nodejs";
export const maxDuration = 60;

/** One-time seed after first deploy. Requires SETUP_SECRET header. Remove SETUP_SECRET from env after use. */
export async function POST(request: Request) {
  const secret = process.env.SETUP_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "SETUP_SECRET not configured." }, { status: 503 });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    await seedDatabase();
    return NextResponse.json({ ok: true, message: "Database seeded." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Seed failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
