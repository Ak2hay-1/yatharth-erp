import fs from "fs";
import crypto from "crypto";

const path = ".env";
let content = fs.readFileSync(path, "utf8");

function hasKey(key) {
  return new RegExp(`^${key}=`, "m").test(content);
}

function append(key, value) {
  content += `${key}="${value}"\n`;
}

if (!hasKey("CRON_SECRET")) append("CRON_SECRET", crypto.randomBytes(32).toString("hex"));
if (!hasKey("YATHARTH_DEPLOYMENT_ID")) append("YATHARTH_DEPLOYMENT_ID", "yatharth-erp-dev");
if (!hasKey("BLOB_READ_WRITE_TOKEN")) append("BLOB_READ_WRITE_TOKEN", "");
if (!hasKey("SETUP_SECRET")) append("SETUP_SECRET", crypto.randomBytes(32).toString("hex"));

if (/^AUTH_SECRET="replace-with/m.test(content)) {
  content = content.replace(
    /^AUTH_SECRET=.*$/m,
    `AUTH_SECRET="${crypto.randomBytes(32).toString("hex")}"`,
  );
}

fs.writeFileSync(path, content);
console.log("Updated .env with missing app vars (secrets not printed)");
