import fs from "fs";
import { prisma } from "@/lib/prisma";
import { resolveDocumentPath } from "@/lib/document-storage";
import { pushAsset, pushCompany, pushProducts } from "@/lib/sync/client";
import { isSyncConfigured, readSyncConfig, writeSyncConfig } from "@/lib/sync/config";
import { mapCompanyToSync, mapItemToSyncProduct, pickPrimaryAsset } from "@/lib/sync/mapper";
import { consumeQueueSnapshot } from "@/lib/sync/queue";
import type { SyncProductPayload } from "@/lib/sync/types";

async function loadFinishedProducts(skus?: string[]): Promise<SyncProductPayload[]> {
  const items = await prisma.item.findMany({
    where: {
      type: "FINISHED",
      ...(skus?.length ? { sku: { in: skus } } : {}),
    },
    include: { label: true },
    orderBy: [{ lane: "asc" }, { name: "asc" }],
  });

  return items.map((item, index) => mapItemToSyncProduct(item, item.label, index + 1));
}

async function syncAssetsForSkus(apiUrl: string, secret: string, skus: string[]) {
  for (const sku of skus) {
    const item = await prisma.item.findUnique({
      where: { sku },
      include: { productAssets: { orderBy: { createdAt: "desc" } } },
    });
    if (!item) continue;
    const asset = pickPrimaryAsset(item.productAssets);
    if (!asset) continue;

    const filePath = resolveDocumentPath(asset.storageKey);
    if (!fs.existsSync(filePath)) continue;

    const buf = fs.readFileSync(filePath);
    await pushAsset(apiUrl, secret, sku, buf, asset.fileName, asset.mimeType, asset.kind, asset.title);
  }
}

export async function runSyncJob(opts?: { full?: boolean; skus?: string[]; company?: boolean; assets?: string[] }) {
  if (!opts?.full && !opts?.skus?.length && !opts?.company && !opts?.assets?.length) {
    return { ok: true, skipped: true };
  }
  const config = readSyncConfig();
  if (!isSyncConfigured(config)) {
    return { ok: false, error: "Sync not configured" };
  }

  const apiUrl = config.apiUrl.trim();
  const secret = config.syncSecret.trim();

  try {
    let productCount = 0;

    if (opts?.full || opts?.skus?.length) {
      const products = await loadFinishedProducts(opts.full ? undefined : opts.skus);
      if (products.length) {
        const res = await pushProducts(apiUrl, secret, products);
        productCount = res.count;
      }
    }

    if (opts?.full || opts?.company) {
      const company = await prisma.company.findUnique({ where: { id: "default" } });
      if (company) {
        await pushCompany(apiUrl, secret, mapCompanyToSync(company));
      }
    }

    if (opts?.assets?.length) {
      await syncAssetsForSkus(apiUrl, secret, opts.assets);
    }

    writeSyncConfig({
      lastSyncAt: new Date().toISOString(),
      lastError: null,
      lastProductCount: productCount || config.lastProductCount,
    });

    return { ok: true, productCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    writeSyncConfig({ lastError: message });
    return { ok: false, error: message };
  }
}

export async function runQueuedSync() {
  const snapshot = consumeQueueSnapshot();
  return runSyncJob({
    full: snapshot.fullProducts,
    skus: snapshot.productSkus,
    company: snapshot.company,
    assets: snapshot.assetSkus,
  });
}

export async function publishAllToWebsite() {
  const items = await prisma.item.findMany({ where: { type: "FINISHED" }, select: { sku: true } });
  return runSyncJob({
    full: true,
    company: true,
    assets: items.map((i) => i.sku),
  });
}

// Register queue flush on module load (server-side only)
import { setSyncFlushCallback } from "@/lib/sync/queue";
setSyncFlushCallback(() => runQueuedSync());
