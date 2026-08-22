/**
 * Local integration test: ERP-style signed push → VM API → public read.
 * Usage: node scripts/test-sync-flow.mjs [apiUrl] [secret]
 */
import { createHmac } from "crypto";

const apiUrl = (process.argv[2] ?? "http://localhost:3001").replace(/\/+$/, "");
const secret = process.argv[3] ?? "change-me-in-production";
const machineId = "test-machine-local";

function sign(ts, body) {
  return createHmac("sha256", secret).update(`${ts}.${machineId}.${body}`).digest("hex");
}

async function signed(method, path, body) {
  const ts = String(Date.now());
  const bodyStr = body === undefined ? "" : JSON.stringify(body);
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Yatharth-Machine-Id": machineId,
      "X-Yatharth-Timestamp": ts,
      "X-Yatharth-Signature": sign(ts, bodyStr),
    },
    body: body === undefined ? undefined : bodyStr,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

const sampleProducts = {
  products: [
    {
      sku: "FG-ALOO-REG",
      name: "Regular - Aloo Burger Patty",
      category: "veg",
      lane: "POTATO_VEG",
      tier: "HERO",
      packSize: "20 pcs",
      unitsPerPkt: 20,
      usp: 14,
      rateB2b: 280,
      isActive: true,
      sortOrder: 1,
    },
  ],
};

await signed("POST", "/v1/sync/company", {
  name: "YATHARTHA Foods & Beverages",
  legalName: "YATHARTHA Foods & Beverages",
  address: "Shop No. 29, Harshal Heights, PCMC Link Road, Chinchwad",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411033",
  phone: "7028832038",
  email: "accounts@yatharthfoods.in",
  gstin: "27AABCY1234A1Z5",
  fssai: "11524999000012",
});

const push = await signed("POST", "/v1/sync/products", sampleProducts);
console.log("Push:", push);

const list = await fetch(`${apiUrl}/v1/public/price-list`).then((r) => r.json());
console.log("Public price-list veg count:", list.veg?.length ?? 0);

const status = await signed("GET", "/v1/sync/status");
console.log("Sync status:", status);

console.log("OK — ERP → VM → public read path works.");
