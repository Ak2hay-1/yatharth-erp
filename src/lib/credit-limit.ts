/** A limit of 0 or below means no cap. */
export function creditLimitExceeded(limit: number, outstanding: number, extraAmount: number) {
  if (limit <= 0) return false;
  return outstanding + extraAmount - limit > 0.009;
}
