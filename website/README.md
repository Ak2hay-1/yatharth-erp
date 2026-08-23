# Yathartha Website (Vercel)

Marketing site for **https://yatharthafoods.in**. Reads catalog data from the VM sync API at **https://api.yatharthafoods.in**.

## Local setup

```bash
cd website
npm install
cp .env.example .env.local
# Use localhost lines from .env.example for local dev
npm run dev
```

Open http://localhost:3002

## Vercel deploy

Vercel may auto-detect the ERP app at repo root and `services/sync-api`. **Only deploy `website/`** — the ERP runs on the office PC and sync-api runs on the Vultr VM.

### If you see the "Services" import screen

1. Keep **Framework Preset → Services** (repo root has `vercel.json` for this).
2. You should see one service: **website** (Next.js in `website/`).
3. **Delete** the auto-detected ERP env vars (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`).
4. Add these instead (Production):

   | Variable | Value |
   |----------|--------|
   | `NEXT_PUBLIC_SITE_URL` | `https://yatharthafoods.in` |
   | `NEXT_PUBLIC_API_URL` | `https://api.yatharthafoods.in` |
   | `REVALIDATE_WEBHOOK_SECRET` | Same as VM `REVALIDATE_WEBHOOK_SECRET` |

5. Click **Deploy**.

### Alternative: single Next.js project (no Services)

1. Set **Framework Preset → Next.js** (not Services).
2. **Root Directory → Edit → `website`**
3. Add the three env vars above.
4. Deploy.

### After deploy

1. Add custom domain **yatharthafoods.in** in Vercel → Domains.
2. Confirm:
   - https://yatharthafoods.in loads
   - https://yatharthafoods.in/sitemap.xml
   - VM `VERCEL_REVALIDATE_URL` = `https://yatharthafoods.in/api/revalidate`

## DNS (website)

At your domain registrar / DNS host for `yatharthafoods.in`:

- **Apex** `@` → Vercel A record (Vercel dashboard → Domains shows the IP)
- **www** → CNAME to `cname.vercel-dns.com` (or use Vercel nameservers)

Vercel handles HTTPS automatically once DNS is verified.

## DNS — API subdomain (required for catalog / contact)

The website reads data from **`https://api.yatharthafoods.in`**. This is **not** created automatically when you point the main domain at Vercel.

At **Cloudflare → DNS** (nameservers: `*.ns.cloudflare.com`), add:

| Type | Name | Content |
|------|------|---------|
| A | `api` | Vultr VM public IP |

Set proxy to **DNS only** (grey cloud). See `docs/DEPLOY.md` for TLS and health-check steps.
