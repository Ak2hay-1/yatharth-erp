import { createHmac, timingSafeEqual } from "crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

type SignedRequest = FastifyRequest & { rawBody?: string };

const MAX_SKEW_MS = 5 * 60 * 1000;

export function signPayload(secret: string, machineId: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${machineId}.${body}`).digest("hex");
}

export function verifySyncRequest(
  secret: string,
  machineId: string,
  timestamp: string,
  signature: string,
  body: string,
): boolean {
  if (!secret || !machineId || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) return false;
  const expected = signPayload(secret, machineId, timestamp, body);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function requireSyncAuth(request: FastifyRequest, reply: FastifyReply) {
  const secret = process.env.SYNC_SECRET ?? "";
  const machineId = String(request.headers["x-yatharth-machine-id"] ?? "");
  const timestamp = String(request.headers["x-yatharth-timestamp"] ?? "");
  const signature = String(request.headers["x-yatharth-signature"] ?? "");
  const isBodyLess = request.method === "GET" || request.method === "HEAD";
  const body = isBodyLess
    ? ""
    : typeof (request as SignedRequest).rawBody === "string"
      ? (request as SignedRequest).rawBody!
      : JSON.stringify(request.body ?? {});

  if (!verifySyncRequest(secret, machineId, timestamp, signature, body)) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}
