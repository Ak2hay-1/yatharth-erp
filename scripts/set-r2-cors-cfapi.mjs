/**
 * Set R2 CORS via Cloudflare API (needs account API token with R2 edit).
 * Env: CF_API_TOKEN, R2_ACCOUNT_ID, R2_BUCKET
 */
const token = process.env.CF_API_TOKEN?.trim() ?? "";
const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
const bucket = process.env.R2_BUCKET?.trim() ?? "yatharth-foods";

if (!token || !accountId) {
  console.error("FAIL: set CF_API_TOKEN and R2_ACCOUNT_ID");
  process.exit(1);
}

const rules = [
  {
    AllowedOrigins: ["https://erp.yatharthafoods.in", "http://localhost:3000"],
    AllowedMethods: ["GET", "PUT", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag", "Content-Type"],
    MaxAgeSeconds: 3600,
  },
];

const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`;
const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(rules),
});
const text = await res.text();
console.log(`status=${res.status}`);
console.log(text.slice(0, 500));
if (!res.ok) process.exit(1);
console.log("OK: CORS applied via Cloudflare API");
