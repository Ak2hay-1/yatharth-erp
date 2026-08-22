type QueueState = {
  products: Set<string>;
  company: boolean;
  assets: Set<string>;
};

const state: QueueState = {
  products: new Set(),
  company: false,
  assets: new Set(),
};

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushCallback: (() => Promise<unknown>) | null = null;

export function setSyncFlushCallback(cb: () => Promise<unknown>) {
  flushCallback = cb;
}

export function enqueueProductSync(sku: string) {
  state.products.add(sku);
  scheduleFlush();
}

export function enqueueCompanySync() {
  state.company = true;
  scheduleFlush();
}

export function enqueueAssetSync(sku: string) {
  state.assets.add(sku);
  scheduleFlush();
}

export function enqueueFullSync() {
  state.company = true;
  state.products.add("*");
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushCallback?.();
  }, 1500);
}

export function consumeQueueSnapshot(): {
  fullProducts: boolean;
  productSkus: string[];
  company: boolean;
  assetSkus: string[];
} {
  const fullProducts = state.products.has("*");
  const productSkus = [...state.products].filter((s) => s !== "*");
  const snapshot = {
    fullProducts,
    productSkus,
    company: state.company,
    assetSkus: [...state.assets],
  };
  state.products.clear();
  state.assets.clear();
  state.company = false;
  return snapshot;
}

export function peekQueue(): { company: boolean; productCount: number; assetCount: number } {
  return {
    company: state.company,
    productCount: state.products.size,
    assetCount: state.assets.size,
  };
}
