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

1. Import repo in [Vercel](https://vercel.com/new), set **Root Directory** to `website`.
2. Add custom domain **yatharthafoods.in** (and optionally `www.yatharthafoods.in`).
3. Environment variables (Production):

   | Variable | Value |
   |----------|--------|
   | `NEXT_PUBLIC_SITE_URL` | `https://yatharthafoods.in` |
   | `NEXT_PUBLIC_API_URL` | `https://api.yatharthafoods.in` |
   | `REVALIDATE_WEBHOOK_SECRET` | Same as VM `REVALIDATE_WEBHOOK_SECRET` |

4. After DNS propagates, confirm:
   - https://yatharthafoods.in loads
   - https://yatharthafoods.in/sitemap.xml
   - VM `VERCEL_REVALIDATE_URL` = `https://yatharthafoods.in/api/revalidate`

Copy `public/logo.png` from ERP `media/logo.png` before deploy (already in repo if synced).

## DNS (website)

At your domain registrar / DNS host for `yatharthafoods.in`:

- **Apex** `@` → Vercel A record (Vercel dashboard → Domains shows the IP)
- **www** → CNAME to `cname.vercel-dns.com` (or use Vercel nameservers)

Vercel handles HTTPS automatically once DNS is verified.
