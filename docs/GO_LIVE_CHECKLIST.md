# Go-live checklist

Use this once per launch. Details: [DEPLOY.md](DEPLOY.md), [USER_MANUAL.md](USER_MANUAL.md).

## A. Secrets (once)

```powershell
powershell -File scripts/Generate-ProdSecrets.ps1 -Show
```

Copy values into:

- VM `services/sync-api/.env` — `SYNC_SECRET`, `REVALIDATE_WEBHOOK_SECRET`, `POSTGRES_PASSWORD`
- Vercel **website** project — `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, `REVALIDATE_WEBHOOK_SECRET`
- Vercel **ERP** project — `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `YATHARTH_DEPLOYMENT_ID`, `SETUP_SECRET` (temporary)
- ERP Settings → Website sync — API URL + the same `SYNC_SECRET`
- Optional SMTP on the VM for contact-form email (`SMTP_*`, `CONTACT_NOTIFY_TO`)

Do not commit `secrets/prod-secrets.env`.

## B. API DNS + TLS

1. Cloudflare → `yatharthafoods.in` → DNS → **A** `api` → Vultr VM IPv4.
2. Proxy **DNS only** (grey cloud), not orange.
3. On the VM: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`
4. From a PC: `powershell -File scripts/Verify-ApiHealth.ps1`

Expect Vultr IP (not `104.21.x`) and `{"ok":true}` from `https://api.yatharthafoods.in/health`.

## C. Website (Vercel)

1. Deploy **only** `website/` (see [../website/README.md](../website/README.md)).
2. Domain `yatharthafoods.in` attached.
3. `powershell -File scripts/Verify-Website.ps1`

## D. ERP (Vercel)

1. New Vercel project, root `.`, domain `erp.yatharthafoods.in`.
2. Neon Postgres + Vercel Blob connected; all env vars set (see [DEPLOY.md](DEPLOY.md)).
3. Deploy; run one-time seed via `/api/setup/seed`; remove `SETUP_SECRET`.
4. `powershell -File scripts/Verify-ErpHealth.ps1`
5. Sign in as Super Admin; **change** owner password.
6. Create Admin / Staff users.
7. Company details, items, parties, recipes.

## E. Publish catalog from ERP

1. Super Admin → Settings → fill real GSTIN / FSSAI / bank (not seed placeholders).
2. Masters: finished SKUs, USP / B2B rates, pack photos.
3. Settings → Website sync: enable, API URL `https://api.yatharthafoods.in`, paste `SYNC_SECRET`.
4. **Publish to website**.
5. Confirm `https://yatharthafoods.in/price-list` and `/products` show SKUs.
6. **Load enquiries** after a test contact form submit.

Website sync queue flushes via Vercel Cron (~every 2 min on Pro) or manual **Publish / Flush**.

## F. After go-live (ops)

- Check Settings → Website enquiries daily (or SMTP inbox).
- Re-publish after major catalog changes if sync was disabled.
- Database backups: managed by Neon (see Settings → Database backups note in ERP).

## G. Desktop installer (paused)

The Windows `.exe` path is on hold. Do not distribute `dist-installer/` for new installs — use `https://erp.yatharthafoods.in` instead.
