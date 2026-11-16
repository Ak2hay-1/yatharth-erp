import { getSessionUser } from "@/lib/session";
import { can, OPS } from "@/lib/permissions";
import { r2Configured, uploadR2MultipartPart } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PART_BYTES = 1_500_000; // stay under Vercel 4.5MB with headers

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Sign in to upload.", { status: 401 });
  if (!can(user.role, OPS)) return new Response("You cannot upload product images.", { status: 403 });
  if (!r2Configured()) return new Response("Image storage is not configured.", { status: 503 });

  const objectKey = String(request.headers.get("x-r2-key") ?? "").trim();
  const uploadId = String(request.headers.get("x-r2-upload-id") ?? "").trim();
  const partNumber = Number(request.headers.get("x-r2-part-number") ?? "0");

  if (!objectKey.startsWith("product-assets/") || !uploadId || !Number.isInteger(partNumber) || partNumber < 1) {
    return new Response("Invalid multipart part headers.", { status: 400 });
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length <= 0 || bytes.length > MAX_PART_BYTES) {
    return new Response("Part size must be between 1 byte and 1.5 MB.", { status: 400 });
  }

  try {
    const part = await uploadR2MultipartPart(objectKey, uploadId, partNumber, bytes);
    return Response.json(part);
  } catch (err) {
    console.error("[product-assets/multipart/part]", err);
    const message = err instanceof Error ? err.message : "Part upload failed.";
    return new Response(message, { status: 502 });
  }
}
