export const PRODUCT_LANES = [
  { value: "NONE", label: "—" },
  { value: "POTATO_VEG", label: "Potato / veg" },
  { value: "CHICKEN", label: "Chicken" },
  { value: "PANEER_CHEESE", label: "Paneer / cheese" },
] as const;

export const SKU_TIERS = [
  { value: "NONE", label: "—" },
  { value: "HERO", label: "Hero" },
  { value: "CORE", label: "Core" },
  { value: "CUSTOM", label: "Custom / private label" },
] as const;

export const PACK_TYPES = [
  { value: "NONE", label: "—" },
  { value: "HORECA", label: "HoReCa (1 / 2 / 5 kg)" },
  { value: "RETAIL", label: "Retail (200–500 g)" },
] as const;

export const BUYER_CLUSTERS = [
  { value: "NONE", label: "—" },
  { value: "QSR_CAFE", label: "QSR / cafe" },
  { value: "RESTAURANT_HOTEL", label: "Restaurant / hotel" },
  { value: "CATERER", label: "Caterer" },
  { value: "DISTRIBUTOR", label: "Distributor" },
] as const;

export const PARTY_LIFECYCLES = [
  { value: "PROSPECT", label: "Prospect" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "INACTIVE", label: "Inactive" },
] as const;

export const ORDER_KINDS = [
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "SAMPLE", label: "Sample" },
  { value: "TRIAL", label: "Trial" },
] as const;

export const WASTE_CAUSES = [
  { value: "PRODUCTION", label: "Production" },
  { value: "FREEZER", label: "Freezer" },
  { value: "RETURN", label: "Return" },
  { value: "OTHER", label: "Other" },
] as const;

export const COMPLAINT_ISSUES = [
  { value: "DRY", label: "Too dry" },
  { value: "SIZE", label: "Size" },
  { value: "COATING", label: "Coating" },
  { value: "WEIGHT", label: "Weight" },
  { value: "THAW", label: "Thaw / cold chain" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "TASTE", label: "Taste" },
  { value: "OTHER", label: "Other" },
] as const;

export const COMPLAINT_STATUSES = [
  { value: "OPEN", label: "Reported" },
  { value: "ROOT_CAUSE", label: "Root cause" },
  { value: "CHANGE", label: "Change" },
  { value: "NEW_SAMPLE", label: "New sample" },
  { value: "TEST", label: "Customer test" },
  { value: "STANDARDISED", label: "Standardised" },
  { value: "CLOSED", label: "Closed" },
] as const;

export const DOCUMENT_CATEGORIES = [
  { value: "SOP", label: "SOP" },
  { value: "OTHER", label: "Other document" },
] as const;

export const PRODUCT_ASSET_KINDS = [
  { value: "PACK_SHOT", label: "Pack shot" },
  { value: "LABEL_ART", label: "Label art" },
  { value: "PROCESS", label: "Process / plant" },
  { value: "OTHER", label: "Other" },
] as const;

export const CONTENT_LOCALES = [
  { value: "en_IN", label: "English" },
  { value: "en_US", label: "English (US)" },
  { value: "en_GB", label: "English (UK)" },
  { value: "hi", label: "हिंदी" },
  { value: "mr", label: "मराठी" },
] as const;

/** Primary SOP / plant-doc language tabs (EN / HI / MR). */
export const SOP_LOCALES = [
  { value: "en_IN", label: "English" },
  { value: "hi", label: "हिंदी" },
  { value: "mr", label: "मराठी" },
] as const;

export const DOCUMENT_TAGS = [
  { value: "", label: "—" },
  { value: "FSSAI", label: "FSSAI / licence" },
  { value: "BMR", label: "BMR" },
  { value: "QC", label: "QC / lab" },
  { value: "TRAINING", label: "Training" },
  { value: "POLICY", label: "Policy" },
  { value: "OTHER", label: "Other" },
] as const;

export const KPI_TARGETS = {
  contributionPct: 35,
  yieldPct: 95,
  rejectionPct: 2,
  complaintPct: 2,
  repeatPct: 50,
  wastagePct: 3,
  onTimePct: 95,
  newCustomersPerMonth: 10,
} as const;

export function labelOf<T extends { value: string; label: string }>(list: readonly T[], value: string | null | undefined) {
  return list.find((x) => x.value === value)?.label ?? value ?? "—";
}
