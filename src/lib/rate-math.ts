/** Client-safe rate helpers (no Prisma). */

export function suggestedRate(mfgCost: number, markupPct: number) {
  return Math.round(mfgCost * (1 + markupPct / 100) * 100) / 100;
}
