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

Use a **separate Vercel project** with **Root Directory → `website`**. The ERP runs at `erp.yatharthafoods.in` (repo root — see [../docs/DEPLOY.md](../docs/DEPLOY.md)); sync-api runs on the Vultr VM.

### Recommended: single Next.js project

1. **Framework Preset → Next.js**
2. **Root Directory → Edit → `website`**
3. Add env vars (Production):
4. Deploy.

### After deploy

1. Add custom domain **yatharthafoods.in** in Vercel → Domains.
2. Confirm:
   - https://yatharthafoods.in loads
   - https://yatharthafoods.in/sitemap.xml
   - VM `VERCEL_REVALIDATE_URL` = `https://yatharthafoods.in/api/revalidate`
3. From the repo: `powershell -File scripts/Verify-Website.ps1`

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
