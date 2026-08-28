import { createHmac, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { readAppSetting, writeAppSetting } from "@/lib/app-settings";
import { readDocumentBytes } from "@/lib/document-storage";
import { getMachineId } from "@/lib/machine-id";
import {
  DEFAULT_WEBSITE_SYNC,
  normalizeApiUrl,
  type WebsiteSyncQueueItem,
  type WebsiteSyncQueueKind,
  type WebsiteSyncSettings,
} from "@/lib/website-sync-config";

export {
  DEFAULT_WEBSITE_SYNC,
  normalizeApiUrl,
  type WebsiteSyncQueueItem,
  type WebsiteSyncQueueKind,
  type WebsiteSyncSettings,
} from "@/lib/website-sync-config";

const SETTINGS_KEY = "website-sync";

function mapQueueRow(row: {
  id: string;
  kind: string;
  ref: string;
  attempts: number;
  lastError: string;
  createdAt: Date;
}): WebsiteSyncQueueItem {
  return {
    id: row.id,
    kind: row.kind as WebsiteSyncQueueKind,
    ref: row.ref,
    createdAt: row.createdAt.toISOString(),
    attempts: row.attempts,
    lastError: row.lastError,
  };
}

export async function readWebsiteSyncSettings(): Promise<WebsiteSyncSettings> {
  return readAppSetting<WebsiteSyncSettings>(SETTINGS_KEY, DEFAULT_WEBSITE_SYNC);
}

export async function writeWebsiteSyncSettings(settings: WebsiteSyncSettings) {
  await writeAppSetting(SETTINGS_KEY, settings);
}

async function readQueue(): Promise<WebsiteSyncQueueItem[]> {
  const rows = await prisma.websiteSyncQueueItem.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(mapQueueRow);
}

async function clearQueue() {
  await prisma.websiteSyncQueueItem.deleteMany();
}

export async function enqueueWebsiteSync(kind: WebsiteSyncQueueKind, ref = "") {
  const settings = await readWebsiteSyncSettings();
  if (!settings.enabled) return;

  const normalizedRef = String(ref ?? "").trim();
  if (kind === "company" || kind === "products") {
    const existing = await prisma.websiteSyncQueueItem.findFirst({ where: { kind } });
    if (existing) return;
  } else {
    const existing = await prisma.websiteSyncQueueItem.findFirst({
      where: { kind: "asset", ref: normalizedRef },
    });
    if (existing) return;
  }

  await prisma.websiteSyncQueueItem.create({
    data: {
      id: randomBytes(8).toString("hex"),
      kind,
      ref: normalizedRef,
    },
  });
}

function signPayload(secret: string, machineId: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${machineId}.${body}`).digest("hex");
}

function requireMachineId(): string {
  return getMachineId() || "dev-local";
}

async function signedFetch(
  settings: WebsiteSyncSettings,
  method: string,
  routePath: string,
  bodyText: string | null,
  init?: RequestInit & { multipart?: boolean },
): Promise<Response> {
  const base = normalizeApiUrl(settings.apiUrl);
  const secret = settings.syncSecret.trim();
  if (!secret) throw new Error("Sync secret is required.");
  const machineId = requireMachineId();
  const timestamp = String(Date.now());
  const signBody = init?.multipart ? "" : (bodyText ?? "");
  const signature = signPayload(secret, machineId, timestamp, signBody);

  const headers = new Headers(init?.headers);
  headers.set("x-yatharth-machine-id", machineId);
  headers.set("x-yatharth-timestamp", timestamp);
  headers.set("x-yatharth-signature", signature);
  if (bodyText !== null && !init?.multipart) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${base}${routePath}`, {
    ...init,
    method,
    headers,
    body: init?.body ?? (bodyText === null ? undefined : bodyText),
  });
}

async function readJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function tierSortOrder(tier: string): number {
  if (tier === "HERO") return 0;
  if (tier === "CORE") return 10;
  if (tier === "CUSTOM") return 20;
  return 100;
}

function toCategory(lane: string, vegNonVeg?: string | null): "veg" | "non-veg" {
  if (vegNonVeg === "NON_VEG") return "non-veg";
  if (vegNonVeg === "VEG") return "veg";
  if (lane === "CHICKEN") return "non-veg";
  return "veg";
}

function parseUnitsPerPkt(packSize: string, servingsPerPack?: string | null): number {
  const fromServings = Number(String(servingsPerPack ?? "").trim());
  if (Number.isFinite(fromServings) && fromServings > 0) return Math.trunc(fromServings);
  const match = String(packSize ?? "").match(/(\d+)\s*[x×]/i);
  if (match) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > 0) return Math.trunc(n);
  }
  return 1;
}

type CatalogItem = {
  sku: string;
  name: string;
  lane: string;
  tier: string;
  packSize: string;
  usp: number;
  rateB2b: number;
  sellingPrice: number;
  isActive: boolean;
  updatedAt?: Date | null;
  label: { vegNonVeg: string; servingsPerPack: string } | null;
  productAssets: Array<{
    id: string;
    kind: string;
    title: string;
    fileName: string;
    mimeType: string;
    storageKey: string;
  }>;
};

async function loadFinishedCatalog(): Promise<CatalogItem[]> {
  const items = await prisma.item.findMany({
    where: { type: "FINISHED" },
    orderBy: [{ name: "asc" }],
    include: {
      label: { select: { vegNonVeg: true, servingsPerPack: true } },
      productAssets: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          kind: true,
          title: true,
          fileName: true,
          mimeType: true,
          storageKey: true,
        },
      },
    },
  });

  return items.map((item) => ({
    sku: item.sku,
    name: item.name,
    lane: item.lane,
    tier: item.tier,
    packSize: item.packSize,
    usp: item.usp,
    rateB2b: item.rateB2b || item.sellingPrice,
    sellingPrice: item.sellingPrice,
    isActive: item.isActive,
    updatedAt: item.mfgCostUpdatedAt ?? item.createdAt,
    label: item.label,
    productAssets: item.productAssets,
  }));
}

function mapProductsPayload(items: CatalogItem[]) {
  return {
    products: items.map((item, index) => ({
      sku: item.sku,
      name: item.name,
      category: toCategory(item.lane, item.label?.vegNonVeg),
      lane: item.lane === "NONE" ? "" : item.lane,
      tier: item.tier === "NONE" ? "" : item.tier,
      packSize: item.packSize,
      unitsPerPkt: parseUnitsPerPkt(item.packSize, item.label?.servingsPerPack),
      usp: item.usp > 0 ? item.usp : item.sellingPrice,
      rateB2b: item.rateB2b > 0 ? item.rateB2b : item.sellingPrice,
      isActive: item.isActive,
      sortOrder: tierSortOrder(item.tier) + index,
      erpUpdatedAt: (item.updatedAt ?? new Date()).toISOString(),
    })),
  };
}

async function pushCompany(settings: WebsiteSyncSettings) {
  const company = await prisma.company.findUnique({ where: { id: "default" } });
  if (!company) throw new Error("Company details are missing. Save Settings first.");

  const payload = {
    name: company.name,
    legalName: company.legalName,
    address: company.address,
    city: company.city,
    state: company.state,
    pincode: company.pincode,
    phone: company.phone,
    email: company.email,
    gstin: company.gstin,
    fssai: company.fssai,
  };
  const body = JSON.stringify(payload);
  const res = await signedFetch(settings, "POST", "/v1/sync/company", body);
  const data = await readJsonSafe(res);
  if (!res.ok) {
    throw new Error(`Company sync failed (${res.status}): ${JSON.stringify(data)}`);
  }
}

async function pushProducts(settings: WebsiteSyncSettings, items?: CatalogItem[]) {
  const catalog = items ?? (await loadFinishedCatalog());
  const payload = mapProductsPayload(catalog);
  const body = JSON.stringify(payload);
  const res = await signedFetch(settings, "POST", "/v1/sync/products", body);
  const data = await readJsonSafe(res);
  if (!res.ok) {
    throw new Error(`Products sync failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return catalog;
}

async function clearAssets(settings: WebsiteSyncSettings, sku: string) {
  const res = await signedFetch(settings, "DELETE", `/v1/sync/assets/${encodeURIComponent(sku)}`, "");
  if (res.status === 404) return;
  const data = await readJsonSafe(res);
  if (!res.ok) {
    throw new Error(`Clear assets failed for ${sku} (${res.status}): ${JSON.stringify(data)}`);
  }
}

async function pushAsset(
  settings: WebsiteSyncSettings,
  sku: string,
  asset: CatalogItem["productAssets"][number],
) {
  const buf = await readDocumentBytes(asset.storageKey);
  const bytes = new Uint8Array(buf);
  const form = new FormData();
  const file = new File([bytes], asset.fileName || "asset.bin", {
    type: asset.mimeType || "application/octet-stream",
  });
  form.append("file", file);
  form.append("kind", asset.kind || "OTHER");
  form.append("title", asset.title || "");

  const res = await signedFetch(settings, "POST", `/v1/sync/assets/${encodeURIComponent(sku)}`, null, {
    multipart: true,
    body: form,
  });
  const data = await readJsonSafe(res);
  if (!res.ok) {
    throw new Error(`Asset sync failed for ${sku} (${res.status}): ${JSON.stringify(data)}`);
  }
}

async function pushAssetsForItem(settings: WebsiteSyncSettings, item: CatalogItem) {
  if (!item.productAssets.length) {
    await clearAssets(settings, item.sku).catch(() => undefined);
    return;
  }
  await clearAssets(settings, item.sku);
  for (const asset of item.productAssets) {
    await pushAsset(settings, item.sku, asset);
  }
}

export async function publishWebsiteCatalog() {
  const settings = await readWebsiteSyncSettings();
  normalizeApiUrl(settings.apiUrl);
  if (!settings.syncSecret.trim()) throw new Error("Sync secret is required.");

  try {
    await pushCompany(settings);
    const catalog = await pushProducts(settings);
    for (const item of catalog) {
      await pushAssetsForItem(settings, item);
    }
    await clearQueue();
    const next: WebsiteSyncSettings = {
      ...settings,
      lastPublishAt: new Date().toISOString(),
      lastFlushAt: new Date().toISOString(),
      lastError: "",
      lastStatus: `Published ${catalog.length} finished SKUs`,
    };
    await writeWebsiteSyncSettings(next);
    return { ok: true as const, count: catalog.length, settings: next };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed.";
    const next = { ...settings, lastError: message, lastStatus: "Publish failed" };
    await writeWebsiteSyncSettings(next);
    throw new Error(message);
  }
}

export async function flushWebsiteSyncQueue(reason: "scheduled" | "manual" = "manual") {
  const settings = await readWebsiteSyncSettings();
  if (reason === "scheduled" && !settings.enabled) {
    return { ok: false as const, skipped: true as const, message: "Sync disabled." };
  }
  if (!settings.syncSecret.trim() || !settings.apiUrl.trim()) {
    return { ok: false as const, skipped: true as const, message: "Sync not configured." };
  }

  const queue = await readQueue();
  if (!queue.length) {
    const next = { ...settings, lastFlushAt: new Date().toISOString() };
    await writeWebsiteSyncSettings(next);
    return { ok: true as const, skipped: true as const, message: "Queue empty.", flushed: 0 };
  }

  let flushed = 0;
  let lastError = "";

  try {
    const hasCompany = queue.some((q) => q.kind === "company");
    const hasProducts = queue.some((q) => q.kind === "products");
    const assetSkus = [...new Set(queue.filter((q) => q.kind === "asset" && q.ref).map((q) => q.ref))];

    if (hasCompany) {
      await pushCompany(settings);
      flushed += 1;
    }
    let catalog: CatalogItem[] | undefined;
    if (hasProducts || assetSkus.length) {
      catalog = await loadFinishedCatalog();
    }
    if (hasProducts) {
      await pushProducts(settings, catalog);
      flushed += 1;
    }
    for (const sku of assetSkus) {
      const item = catalog?.find((c) => c.sku === sku);
      if (!item) continue;
      await pushAssetsForItem(settings, item);
      flushed += 1;
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : "Flush failed.";
    for (const item of queue) {
      await prisma.websiteSyncQueueItem.update({
        where: { id: item.id },
        data: {
          attempts: item.attempts + 1,
          lastError,
        },
      });
    }
  }

  if (!lastError) {
    await clearQueue();
  }

  const next: WebsiteSyncSettings = {
    ...settings,
    lastFlushAt: new Date().toISOString(),
    lastError,
    lastStatus: lastError ? "Flush failed" : `Flushed ${flushed} job(s)`,
  };
  await writeWebsiteSyncSettings(next);

  if (lastError && reason === "manual") throw new Error(lastError);
  return {
    ok: !lastError,
    skipped: false as const,
    flushed,
    message: lastError || `Flushed ${flushed} job(s)`,
    settings: next,
  };
}

export async function fetchWebsiteInquiries(limit = 50) {
  const settings = await readWebsiteSyncSettings();
  if (!settings.syncSecret.trim()) throw new Error("Sync secret is required.");
  const res = await signedFetch(
    settings,
    "GET",
    `/v1/sync/inquiries?limit=${Math.min(Math.max(limit, 1), 200)}`,
    null,
  );
  const data = (await readJsonSafe(res)) as { inquiries?: unknown; error?: unknown };
  if (!res.ok) {
    throw new Error(`Could not load enquiries (${res.status}): ${JSON.stringify(data)}`);
  }
  return Array.isArray(data.inquiries) ? data.inquiries : [];
}

export async function fetchWebsiteSyncStatus() {
  const settings = await readWebsiteSyncSettings();
  if (!settings.syncSecret.trim()) throw new Error("Sync secret is required.");
  const res = await signedFetch(settings, "GET", "/v1/sync/status", null);
  const data = await readJsonSafe(res);
  if (!res.ok) {
    throw new Error(`Status check failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}
