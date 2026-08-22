export type SyncProductPayload = {
  sku: string;
  name: string;
  category: "veg" | "non-veg";
  lane: string;
  tier: string;
  packSize: string;
  unitsPerPkt: number;
  usp: number;
  rateB2b: number;
  isActive: boolean;
  sortOrder: number;
  erpUpdatedAt?: string;
};

export type SyncCompanyPayload = {
  name: string;
  legalName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  fssai: string;
};

export type SyncConfig = {
  enabled: boolean;
  apiUrl: string;
  syncSecret: string;
  lastSyncAt: string | null;
  lastError: string | null;
  lastProductCount: number;
};

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: false,
  apiUrl: "",
  syncSecret: "",
  lastSyncAt: null,
  lastError: null,
  lastProductCount: 0,
};

export type SyncStatusResponse = {
  ok: boolean;
  productCount: number;
  companySynced: boolean;
  lastEvent: { kind: string; at: string; ok: boolean; error: string } | null;
};
