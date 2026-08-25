# Deployment — Local ERP + VM + Vercel

End-to-end setup for the hybrid architecture. Launch checklist: [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md).

## 1. Generate sync secret

```powershell
powershell -File scripts/Generate-ProdSecrets.ps1 -Show
```

Or a one-off 32-byte hex secret:

```powershell
-join ((1..32 | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) }))
```

Use the same values in:

- VM: `SYNC_SECRET`, `REVALIDATE_WEBHOOK_SECRET`, `POSTGRES_PASSWORD`
- ERP: Settings → Website sync → Sync secret
- Vercel: `REVALIDATE_WEBHOOK_SECRET`

## 2. VM backend

On your Ubuntu VM:

```bash
cd services/sync-api
cp .env.example .env
# Fill SYNC_SECRET, REVALIDATE_WEBHOOK_SECRET, POSTGRES_PASSWORD
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
curl http://localhost:3001/health
```

Caddy (`Caddyfile`) terminates HTTPS for `api.yatharthafoods.in` and reverse-proxies to the API. Firewall: allow **80/443** (Let's Encrypt needs 80). Do not publish Postgres.

### DNS — `api.yatharthafoods.in` (Cloudflare)

The marketing site (`yatharthafoods.in`) may already point at Vercel/Cloudflare, but the **API subdomain is separate** and must be added manually.

If `Resolve-DnsName api.yatharthafoods.in` returns **DNS name does not exist**, add this record in **Cloudflare → yatharthafoods.in → DNS**:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| **A** | `api` | Your **Vultr VM public IPv4** | **DNS only** (grey cloud) |

Use **DNS only** (not proxied) so Let's Encrypt on the VM can issue a cert for `api.yatharthafoods.in` and traffic goes straight to Caddy on the VM.

Verify from your PC:

```powershell
powershell -File scripts/Verify-ApiHealth.ps1
```

Expected: DNS shows the VM IP (not `104.21.x`); health returns JSON (e.g. `{"ok":true}`).

**Troubleshooting**

| Symptom | Cause | Fix |
|---------|--------|-----|
| `DNS name does not exist` | No `api` A record | Add A record in Cloudflare |
| Cloudflare **525** | `api` is **proxied** (orange cloud) but VM has no valid HTTPS for Cloudflare to reach | Set `api` to **DNS only** (grey cloud), or install a valid TLS cert on the VM and use SSL mode **Full (strict)** |
| DNS shows `104.21.x` / `2606:4700:…` | Record is proxied through Cloudflare | For VM + Caddy/Let's Encrypt, prefer **DNS only** |
| DNS shows your Vultr IP but HTTPS fails | Caddy or sync-api not running | SSH: `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps`, then `curl http://localhost:3001/health` |

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

After deploy:

```powershell
powershell -File scripts/Verify-Website.ps1
```

## 4. ERP desktop app

1. Install / run ERP on office PC.
2. Settings → Website sync:
   - Enable sync
   - VM API URL: `https://api.yatharthafoods.in`
   - Sync secret: (from step 1)
3. Click **Publish to website** — verify at `https://yatharthafoods.in/price-list`

While ERP is open, queued changes flush about every 2 minutes (`/api/sync/flush` plus the Next scheduler). **Load enquiries** on the same Settings panel to see website contact form submissions.

## 5. Verify data flow

```text
Edit item price in ERP → auto-enqueued → flush → VM PostgreSQL → Vercel ISR / revalidate → website
```

Manual test:

```bash
curl https://api.yatharthafoods.in/v1/public/price-list
```

## Local dev stack

Terminal 1 — VM API (needs Docker for Postgres):

```bash
cd services/sync-api
docker compose up
```

API is on **http://localhost:3001**.

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
