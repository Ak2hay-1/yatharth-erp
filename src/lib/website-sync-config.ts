export type WebsiteSyncSettings = {
  enabled: boolean;
  apiUrl: string;
  syncSecret: string;
  lastPublishAt: string | null;
  lastFlushAt: string | null;
  lastError: string;
  lastStatus: string;
};

export type WebsiteSyncQueueKind = "company" | "products" | "asset";

export type WebsiteSyncQueueItem = {
  id: string;
  kind: WebsiteSyncQueueKind;
  /** SKU for asset jobs; empty for company/products */
  ref: string;
  createdAt: string;
  attempts: number;
  lastError: string;
};

export const DEFAULT_WEBSITE_SYNC: WebsiteSyncSettings = {
  enabled: false,
  apiUrl: "https://api.yatharthafoods.in",
  syncSecret: "",
  lastPublishAt: null,
  lastFlushAt: null,
  lastError: "",
  lastStatus: "",
};

export function normalizeApiUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("API URL is required.");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("API URL must be a full URL, for example https://api.yatharthafoods.in");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("API URL must start with http:// or https://");
  }
  return trimmed;
}
