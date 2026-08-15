import path from "path";

/** Writable app data root (Electron sets YATHARTH_DATA_DIR under userData). */
export function getDataDir(): string {
  const fromEnv = process.env.YATHARTH_DATA_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return process.cwd();
}
