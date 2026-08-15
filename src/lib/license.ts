import { createHash, timingSafeEqual } from "crypto";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { getDataDir } from "@/lib/data-dir";

/** SHA-256 of the Yatharth product key. Never store the plaintext key in source. */
const PRODUCT_KEY_SHA256 = Buffer.from(
  "39eb188954c6c512ad9b49f619b1410f2bb71422cc62e3e385ec69b193edc1e0",
  "hex",
);

const LICENSE_FILE = "license.json";
const MACHINE_ID_FILE = "machine-id.txt";
const KEY_FINGERPRINT = PRODUCT_KEY_SHA256.toString("hex").slice(0, 16);

export type LicenseRecord = {
  activatedAt: string;
  machineId: string;
  keyFingerprint: string;
};

export type LicenseStatus = {
  ok: boolean;
  enforced: boolean;
  machineId: string | null;
  activatedAt: string | null;
  reason?: "skipped" | "missing" | "invalid" | "machine-mismatch" | "no-machine-id";
};

export function isLicenseEnforced(): boolean {
  if (process.env.YATHARTH_SKIP_LICENSE === "1") return false;
  return process.env.NODE_ENV === "production";
}

export function isActivatePath(pathname: string): boolean {
  return pathname === "/activate" || pathname.startsWith("/activate/");
}

export function normalizeMachineId(raw: string): string {
  return raw.trim().replace(/[{}]/g, "").toLowerCase();
}

export function canonicalProductKey(raw: string): string | null {
  const alnum = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!alnum.startsWith("YATH") || alnum.length !== 20) return null;
  const rest = alnum.slice(4);
  return `YATH-${rest.slice(0, 4)}-${rest.slice(4, 8)}-${rest.slice(8, 12)}-${rest.slice(12, 16)}`;
}

let cachedMachineId: string | null | undefined;

export function getMachineId(): string | null {
  if (typeof cachedMachineId === "string" && cachedMachineId) return cachedMachineId;

  const fromEnv = process.env.YATHARTH_MACHINE_ID?.trim();
  if (fromEnv) {
    cachedMachineId = normalizeMachineId(fromEnv);
    return cachedMachineId;
  }

  try {
    const fromFile = fs.readFileSync(machineIdPath(), "utf8").trim();
    if (fromFile) {
      cachedMachineId = normalizeMachineId(fromFile);
      return cachedMachineId;
    }
  } catch {
    // fall through
  }

  const fromWindows = readWindowsMachineGuid();
  if (fromWindows) {
    try {
      fs.writeFileSync(machineIdPath(), fromWindows, "utf8");
    } catch {
      // still return the id even if the cache file cannot be written
    }
    cachedMachineId = fromWindows;
    return cachedMachineId;
  }

  return null;
}

function licensePath() {
  return path.join(getDataDir(), LICENSE_FILE);
}

function machineIdPath() {
  return path.join(getDataDir(), MACHINE_ID_FILE);
}

function readWindowsMachineGuid(): string | null {
  if (process.platform !== "win32") return null;
  try {
    const out = execFileSync(
      "reg",
      ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"],
      { encoding: "utf8", windowsHide: true, timeout: 5000 },
    );
    const match = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/);
    return match ? normalizeMachineId(match[1]) : null;
  } catch {
    return null;
  }
}

function productKeyMatches(canonical: string): boolean {
  const digest = createHash("sha256").update(canonical, "utf8").digest();
  if (digest.length !== PRODUCT_KEY_SHA256.length) return false;
  return timingSafeEqual(digest, PRODUCT_KEY_SHA256);
}

function readLicenseRecord(): LicenseRecord | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(licensePath(), "utf8")) as Partial<LicenseRecord>;
    if (!parsed.activatedAt || !parsed.machineId || !parsed.keyFingerprint) return null;
    return {
      activatedAt: String(parsed.activatedAt),
      machineId: normalizeMachineId(String(parsed.machineId)),
      keyFingerprint: String(parsed.keyFingerprint),
    };
  } catch {
    return null;
  }
}

/**
 * Local license check. Switch this function later to an online API without
 * changing Activate / proxy / Settings call sites.
 */
export function getLicenseStatus(): LicenseStatus {
  const machineId = getMachineId();
  if (!isLicenseEnforced()) {
    return { ok: true, enforced: false, machineId, activatedAt: null, reason: "skipped" };
  }
  if (!machineId) {
    return { ok: false, enforced: true, machineId: null, activatedAt: null, reason: "no-machine-id" };
  }
  const record = readLicenseRecord();
  if (!record) {
    return { ok: false, enforced: true, machineId, activatedAt: null, reason: "missing" };
  }
  if (record.keyFingerprint !== KEY_FINGERPRINT) {
    return { ok: false, enforced: true, machineId, activatedAt: record.activatedAt, reason: "invalid" };
  }
  if (record.machineId !== machineId) {
    return { ok: false, enforced: true, machineId, activatedAt: record.activatedAt, reason: "machine-mismatch" };
  }
  return { ok: true, enforced: true, machineId, activatedAt: record.activatedAt };
}

export function activateLicense(rawKey: string): { ok: true } | { ok: false; error: string } {
  if (!isLicenseEnforced()) return { ok: true };

  const canonical = canonicalProductKey(rawKey);
  if (!canonical || !productKeyMatches(canonical)) {
    return { ok: false, error: "That product key is not valid." };
  }

  const machineId = getMachineId();
  if (!machineId) {
    return { ok: false, error: "Could not identify this PC. Restart the app and try again." };
  }

  const record: LicenseRecord = {
    activatedAt: new Date().toISOString(),
    machineId,
    keyFingerprint: KEY_FINGERPRINT,
  };

  const dest = licensePath();
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return { ok: true };
}
