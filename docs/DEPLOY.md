# Deployment — Cloud ERP + VM + Vercel website

End-to-end setup. Launch checklist: [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md).

```text
erp.yatharthafoods.in (Vercel ERP)  →  api.yatharthafoods.in (VM)  →  yatharthafoods.in (Vercel website)
         PostgreSQL + Blob                      PostgreSQL
```

## 1. Generate secrets

```powershell
powershell -File scripts/Generate-ProdSecrets.ps1 -Show
```

Use the same values in:

- VM: `SYNC_SECRET`, `REVALIDATE_WEBHOOK_SECRET`, `POSTGRES_PASSWORD`
- Vercel **website** project: `REVALIDATE_WEBHOOK_SECRET`
- Vercel **ERP** project: `AUTH_SECRET`, `CRON_SECRET`, `SETUP_SECRET` (one-time seed)
- ERP Settings → Website sync → Sync secret (`SYNC_SECRET`)

## 2. VM sync API

On your Ubuntu VM:

```bash
cd services/sync-api
cp .env.example .env
# Fill SYNC_SECRET, REVALIDATE_WEBHOOK_SECRET, POSTGRES_PASSWORD
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
curl http://localhost:3001/health
```

Caddy terminates HTTPS for `api.yatharthafoods.in`. Firewall: allow **80/443**.

### DNS — `api.yatharthafoods.in` (Cloudflare)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| **A** | `api` | Vultr VM public IPv4 | **DNS only** (grey cloud) |

Verify: `powershell -File scripts/Verify-ApiHealth.ps1`

## 3. Vercel ERP (`erp.yatharthafoods.in`)

Create a **separate** Vercel project from the website project.

| Setting | Value |
|---------|-------|
| Root directory | `.` (repo root) |
| Framework | Next.js |
| Region | `bom1` |
| Build command | `npm run vercel-build` (or use [vercel.json](../vercel.json)) |

### Provision

1. **Neon PostgreSQL** — project **Yathartha foods** (`solitary-pine-12141341`). Use pooled `DATABASE_URL` and direct `DATABASE_URL_UNPOOLED` (both from `neon env pull` or Neon dashboard).
2. **Vercel Blob** — create store; copy `BLOB_READ_WRITE_TOKEN`
3. Set environment variables:

```
DATABASE_URL=<Neon pooled connection string>
DATABASE_URL_UNPOOLED=<Neon direct connection string>
NEON_BRANCH=production
AUTH_SECRET=<random>
AUTH_URL=https://erp.yatharthafoods.in
BLOB_READ_WRITE_TOKEN=<from Vercel Blob>
CRON_SECRET=<random>
YATHARTH_DEPLOYMENT_ID=yatharth-erp-prod
SETUP_SECRET=<random, remove after seeding>
```

4. Deploy from GitHub
5. DNS: Cloudflare **CNAME** `erp` → `cname.vercel-dns.com` (or follow Vercel domain wizard)
6. **Seed** (once, after first successful deploy):

```powershell
$secret = "<SETUP_SECRET>"
Invoke-RestMethod -Method POST -Uri "https://erp.yatharthafoods.in/api/setup/seed" -Headers @{ Authorization = "Bearer $secret" }
```

7. Remove `SETUP_SECRET` from Vercel env after seeding
8. Sign in: `admin@yatharthafoods.in` / `Yatharth@Owner1` — **change password**
9. Settings → Website sync → enable, API URL `https://api.yatharthafoods.in`, paste `SYNC_SECRET` → **Publish to website**

Verify: `powershell -File scripts/Verify-ErpHealth.ps1`

**Cron:** [vercel.json](../vercel.json) flushes the website sync queue once daily (`0 4 * * *` UTC) on Hobby. For ~every 2 minutes, upgrade to Vercel **Pro** and set `schedule` to `*/2 * * * *`, or use manual **Publish / Flush** in Settings anytime.

## 4. Vercel website (`yatharthafoods.in`)

1. Separate Vercel project, root directory: `website`
2. Environment:
   - `NEXT_PUBLIC_SITE_URL=https://yatharthafoods.in`
   - `NEXT_PUBLIC_API_URL=https://api.yatharthafoods.in`
   - `REVALIDATE_WEBHOOK_SECRET=<same as VM>`

On VM `.env`:

```
VERCEL_REVALIDATE_URL=https://yatharthafoods.in/api/revalidate
REVALIDATE_WEBHOOK_SECRET=<same secret>
```

Verify: `powershell -File scripts/Verify-Website.ps1`

## 5. Verify data flow

```text
Edit SKU in ERP → queue → cron flush → VM PostgreSQL → website revalidate → yatharthafoods.in
```

```bash
curl https://api.yatharthafoods.in/v1/public/price-list
```

## Local dev stack

Terminal 1 — Postgres:

```bash
npm run db:up
npm run db:setup
```

Terminal 2 — ERP:

```bash
npm run dev
```

Terminal 3 — VM API (optional, for full sync test):

```bash
cd services/sync-api
docker compose up
```

Terminal 4 — Website:

```bash
cd website
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:3001 > .env.local
npm run dev
```

In ERP Settings, use `http://localhost:3001` as API URL for local testing.

## Desktop app (paused)

Windows installer source remains under `electron/`. To build locally (not deployed):

```bash
npm run desktop:win
```

See [README.md](../README.md).
