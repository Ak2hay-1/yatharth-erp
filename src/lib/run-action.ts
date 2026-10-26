import { actionErrorMessage } from "@/lib/filters";
import { rethrowRedirect } from "@/lib/utils";

export function isActionError(value: unknown): value is { error: string } {
  return !!value && typeof value === "object" && "error" in value && typeof (value as { error: unknown }).error === "string";
}

export function isActionRedirect(value: unknown): value is { redirectTo: string } {
  return !!value && typeof value === "object" && "redirectTo" in value && typeof (value as { redirectTo: unknown }).redirectTo === "string";
}

/** Catch expected validation errors so production does not redact them as HTTP 500. */
export async function runAction<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    rethrowRedirect(e);
    return { error: actionErrorMessage(e) };
  }
}
