# Deployment — Local ERP + VM + Vercel

End-to-end setup for the hybrid architecture.

## 1. Generate sync secret

```powershell
# PowerShell — 32-byte hex secret
-join ((1..32 | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) }))
```

Use the same value in:
- VM: `SYNC_SECRET` (docker compose env)
- ERP: Settings → Website sync → Sync secret
- Vercel + VM revalidate: `REVALIDATE_WEBHOOK_SECRET`

## 2. VM backend

On your Ubuntu VM:

```bash
cd services/sync-api
cp .env.example .env
# Edit SYNC_SECRET, WEBSITE_ORIGIN=https://yatharthafoods.in
docker compose up -d --build
curl http://localhost:3001/health
```

Put Caddy/nginx in front with TLS:

```
api.yatharthafoods.in → localhost:3001
```

Firewall: allow 443 only.

## 3. Vercel website

1. Connect GitHub repo to Vercel.
2. Root directory: `website`
3. Environment:
   - `NEXT_PUBLIC_SITE_URL=https://yatharthafoods.in`
   - `NEXT_PUBLIC_API_URL=https://api.yatharthafoods.in`
   - `REVALIDATE_WEBHOOK_SECRET=<same as VM>`

On VM `.env` also set:

```
VERCEL_REVALIDATE_URL=https://yatharthafoods.in/api/revalidate
REVALIDATE_WEBHOOK_SECRET=<same secret>
```

## 4. ERP desktop app

1. Install / run ERP on office PC.
2. Settings → Website sync:
   - Enable sync
   - VM API URL: `https://api.yatharthafoods.in`
   - Sync secret: (from step 1)
3. Click **Publish to website** — verify at `https://yatharthafoods.in/price-list`

While ERP is open, Electron calls `/api/sync/flush` every 2 minutes to push queued changes.

## 5. Verify data flow

```text
Edit item price in ERP → auto-enqueued → flush → VM PostgreSQL → Vercel ISR / revalidate → website
```

Manual test:

```bash
curl https://api.yatharthafoods.in/v1/public/price-list
```

## Local dev stack

Terminal 1 — VM API (needs Docker for Postgres, or use SQLite dev mode):

```bash
cd services/sync-api
docker compose up
```

Terminal 2 — ERP:

```bash
npm run db:setup
npm run dev
```

Terminal 3 — Website:

```bash
cd website
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:3001 > .env.local
npm run dev
```

In ERP Settings, use `http://localhost:3001` as API URL for local testing.
