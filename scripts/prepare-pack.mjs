/**
 * After `next build` (standalone), stage a complete pack folder for electron-builder.
 * electron-builder often strips node_modules from extraResources — we stage under
 * packaging/app and force-include node_modules via after-pack as a safety net.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");
const stagedApp = path.join(root, "packaging", "app");
const resourcesDir = path.join(root, "packaging", "resources");

function fail(msg) {
  console.error(`[prepare-pack] ${msg}`);
  process.exit(1);
}

function copyDir(from, to) {
  if (!existsSync(from)) fail(`Missing: ${from}`);
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}

if (!existsSync(standalone)) {
  fail("`.next/standalone` not found. Run `npm run build` first (output: standalone).");
}

const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standalone, ".next", "static");
copyDir(staticSrc, staticDest);
console.log("[prepare-pack] Copied .next/static → standalone");

const publicSrc = path.join(root, "public");
if (existsSync(publicSrc)) {
  copyDir(publicSrc, path.join(standalone, "public"));
  console.log("[prepare-pack] Copied public → standalone");
}

const prismaClientSrc = path.join(root, "node_modules", ".prisma");
if (existsSync(prismaClientSrc)) {
  copyDir(prismaClientSrc, path.join(standalone, "node_modules", ".prisma"));
  console.log("[prepare-pack] Copied node_modules/.prisma → standalone");
}

const prismaPkgSrc = path.join(root, "node_modules", "@prisma");
if (existsSync(prismaPkgSrc)) {
  copyDir(prismaPkgSrc, path.join(standalone, "node_modules", "@prisma"));
  console.log("[prepare-pack] Copied node_modules/@prisma → standalone");
}

if (!existsSync(path.join(standalone, "node_modules", "next"))) {
  fail("standalone/node_modules/next missing — Next standalone output is incomplete.");
}

// Fresh staged copy for electron-builder (include node_modules)
if (existsSync(stagedApp)) {
  rmSync(stagedApp, { recursive: true, force: true });
}
mkdirSync(path.dirname(stagedApp), { recursive: true });
cpSync(standalone, stagedApp, { recursive: true });
console.log("[prepare-pack] Staged packaging/app from standalone");

// Do not ship dev .env (would confuse AUTH_URL / DATABASE_URL)
for (const name of [".env", ".env.local", ".env.production"]) {
  const p = path.join(stagedApp, name);
  if (existsSync(p)) {
    unlinkSync(p);
    console.log(`[prepare-pack] Removed ${name} from staged app`);
  }
}

mkdirSync(resourcesDir, { recursive: true });
const templateDest = path.join(resourcesDir, "template.db");
const candidates = [
  path.join(root, "prisma", "dev.db"),
  path.join(root, "packaging", "template.db"),
];
const templateSrc = candidates.find((p) => existsSync(p));
if (!templateSrc) {
  fail(
    "No SQLite template found. Run `npm run db:setup` so prisma/dev.db exists, then rebuild.",
  );
}
cpSync(templateSrc, templateDest);
console.log(`[prepare-pack] Template DB → ${templateDest}`);

const icoSrc = path.join(root, "media", "logo.ico");
if (existsSync(icoSrc)) {
  cpSync(icoSrc, path.join(resourcesDir, "logo.ico"));
  console.log("[prepare-pack] Copied logo.ico");
}

const serverJs = path.join(stagedApp, "server.js");
if (!existsSync(serverJs)) {
  const nested = readdirSync(stagedApp, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(stagedApp, d.name, "server.js"))
    .find((p) => existsSync(p));
  if (!nested) fail("packaging/app/server.js not found after staging.");
  console.log(`[prepare-pack] Note: server.js at ${nested}`);
} else {
  console.log("[prepare-pack] packaging/app/server.js OK");
}

const nmCount = existsSync(path.join(stagedApp, "node_modules"))
  ? readdirSync(path.join(stagedApp, "node_modules")).length
  : 0;
console.log(`[prepare-pack] packaging/app/node_modules entries: ${nmCount}`);
if (nmCount < 1) fail("packaging/app/node_modules is empty.");

console.log("[prepare-pack] Done.");
