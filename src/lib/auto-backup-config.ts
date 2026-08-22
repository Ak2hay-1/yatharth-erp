export type AutoBackupIntervalUnit = "hours" | "days" | "weeks";

export type AutoBackupSettings = {
  enabled: boolean;
  path: string;
  time: string;
  intervalValue: number;
  intervalUnit: AutoBackupIntervalUnit;
  lastAt: string | null;
  lastFile: string;
  lastError: string;
};

export const AUTO_BACKUP_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const DEFAULT_AUTO_BACKUP: AutoBackupSettings = {
  enabled: false,
  path: "",
  time: "18:00",
  intervalValue: 1,
  intervalUnit: "days",
  lastAt: null,
  lastFile: "",
  lastError: "",
};

export function parseBackupTime(value: string): string {
  const trimmed = String(value ?? "").trim().slice(0, 5);
  if (!AUTO_BACKUP_TIME_RE.test(trimmed)) {
    throw new Error("Schedule time must be HH:MM (24-hour), for example 18:00.");
  }
  return trimmed;
}

export function parseBackupInterval(
  value: FormDataEntryValue | null | number,
  unitRaw: FormDataEntryValue | null | string,
): { intervalValue: number; intervalUnit: AutoBackupIntervalUnit } {
  const unit = String(unitRaw ?? "days").trim() as AutoBackupIntervalUnit;
  if (unit !== "hours" && unit !== "days" && unit !== "weeks") {
    throw new Error("Interval must be hours, days, or weeks.");
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error("Interval must be a whole number of 1 or more.");
  }
  const max = unit === "hours" ? 72 : unit === "weeks" ? 12 : 30;
  if (n > max) {
    throw new Error(
      unit === "hours"
        ? "Hourly interval cannot be more than 72 hours."
        : unit === "weeks"
          ? "Weekly interval cannot be more than 12 weeks."
          : "Daily interval cannot be more than 30 days.",
    );
  }
  return { intervalValue: n, intervalUnit: unit };
}

export function intervalToHours(settings: Pick<AutoBackupSettings, "intervalValue" | "intervalUnit">) {
  if (settings.intervalUnit === "hours") return settings.intervalValue;
  if (settings.intervalUnit === "weeks") return settings.intervalValue * 24 * 7;
  return settings.intervalValue * 24;
}

function parseTimeParts(time: string) {
  const [h, m] = parseBackupTime(time).split(":").map(Number);
  return { hours: h, minutes: m };
}

function atLocalTime(base: Date, time: string) {
  const { hours, minutes } = parseTimeParts(time);
  const next = new Date(base);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function nextAutoBackupDue(settings: AutoBackupSettings, now = new Date()): Date | null {
  if (!settings.enabled) return null;
  if (settings.intervalUnit === "hours") {
    if (!settings.lastAt) return now;
    return new Date(new Date(settings.lastAt).getTime() + intervalToHours(settings) * 60 * 60 * 1000);
  }

  const days = settings.intervalUnit === "weeks" ? settings.intervalValue * 7 : settings.intervalValue;
  if (!settings.lastAt) return atLocalTime(now, settings.time);

  const last = new Date(settings.lastAt);
  const next = atLocalTime(last, settings.time);
  next.setDate(next.getDate() + days);
  if (next <= last) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export function isAutoBackupDue(settings: AutoBackupSettings, now = new Date()) {
  const due = nextAutoBackupDue(settings, now);
  return Boolean(due && now >= due);
}

export function describeInterval(settings: Pick<AutoBackupSettings, "intervalValue" | "intervalUnit">) {
  const n = settings.intervalValue;
  if (settings.intervalUnit === "hours") return n === 1 ? "every hour" : `every ${n} hours`;
  if (settings.intervalUnit === "weeks") return n === 1 ? "every week" : `every ${n} weeks`;
  return n === 1 ? "every day" : `every ${n} days`;
}
