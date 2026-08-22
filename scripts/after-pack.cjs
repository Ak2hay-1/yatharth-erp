"use strict";

/**
 * Force-copy Next standalone node_modules into resources/app.
 * electron-builder's default FileMatcher often excludes node_modules from extraResources.
 */
const fs = require("fs");
const path = require("path");

exports.default = async function afterPack(context) {
  const projectDir = context.packager.projectDir;
  const appOutDir = context.appOutDir;
  const src = path.join(projectDir, "packaging", "app", "node_modules");
  const dest = path.join(appOutDir, "resources", "next-server", "node_modules");

  if (!fs.existsSync(src)) {
    throw new Error(`[after-pack] Missing ${src} — run prepare-pack first.`);
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.cpSync(src, dest, { recursive: true });

  const nextPkg = path.join(dest, "next");
  if (!fs.existsSync(nextPkg)) {
    throw new Error(`[after-pack] Copy failed — ${nextPkg} not found.`);
  }

  console.log(`[after-pack] Copied node_modules → ${dest}`);
};
