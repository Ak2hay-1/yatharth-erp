/** Stable deployment id for website-sync HMAC headers (Vercel env). */
export function normalizeMachineId(raw: string): string {
  return raw.trim().replace(/[{}]/g, "").toLowerCase();
}

export function getMachineId(): string | null {
  const fromEnv =
    process.env.YATHARTH_DEPLOYMENT_ID?.trim() || process.env.YATHARTH_MACHINE_ID?.trim();
  if (fromEnv) return normalizeMachineId(fromEnv);
  if (process.env.NODE_ENV === "development") return "dev-local";
  return null;
}
