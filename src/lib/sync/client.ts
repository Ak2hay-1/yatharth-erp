import { createHmac } from "crypto";
import { getMachineId } from "@/lib/license";
import type { SyncCompanyPayload, SyncProductPayload, SyncStatusResponse } from "@/lib/sync/types";

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function sign(secret: string, machineId: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${machineId}.${body}`).digest("hex");
}

async function signedFetch(
  apiUrl: string,
  secret: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const machineId = getMachineId() ?? "unknown";
  const timestamp = String(Date.now());
  const bodyStr = body === undefined ? "" : JSON.stringify(body);
  const signature = sign(secret, machineId, timestamp, bodyStr);

  const headers: Record<string, string> = {
    "X-Yatharth-Machine-Id": machineId,
    "X-Yatharth-Timestamp": timestamp,
    "X-Yatharth-Signature": signature,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const url = `${normalizeBaseUrl(apiUrl)}${path}`;
  return fetch(url, { method, headers, body: body !== undefined ? bodyStr : undefined });
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) {
    const err = (data as { error?: string }).error ?? res.statusText;
    throw new Error(typeof err === "string" ? err : "Sync request failed");
  }
  return data as T;
}

export async function pushProducts(apiUrl: string, secret: string, products: SyncProductPayload[]) {
  const res = await signedFetch(apiUrl, secret, "POST", "/v1/sync/products", { products });
  return parseJson<{ ok: boolean; count: number }>(res);
}

export async function pushCompany(apiUrl: string, secret: string, company: SyncCompanyPayload) {
  const res = await signedFetch(apiUrl, secret, "POST", "/v1/sync/company", company);
  return parseJson<{ ok: boolean }>(res);
}

export async function pushAsset(
  apiUrl: string,
  secret: string,
  sku: string,
  file: Buffer,
  fileName: string,
  mimeType: string,
  kind: string,
  title: string,
) {
  const machineId = getMachineId() ?? "unknown";
  const timestamp = String(Date.now());
  const signature = sign(secret, machineId, timestamp, "");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(file)], { type: mimeType }), fileName);
  form.append("kind", kind);
  form.append("title", title);

  const url = `${normalizeBaseUrl(apiUrl)}/v1/sync/assets/${encodeURIComponent(sku)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Yatharth-Machine-Id": machineId,
      "X-Yatharth-Timestamp": timestamp,
      "X-Yatharth-Signature": signature,
    },
    body: form,
  });
  return parseJson<{ ok: boolean; publicUrl: string }>(res);
}

export async function fetchSyncStatus(apiUrl: string, secret: string): Promise<SyncStatusResponse> {
  const res = await signedFetch(apiUrl, secret, "GET", "/v1/sync/status");
  return parseJson<SyncStatusResponse>(res);
}
