# Go-live checklist

Use this once per launch. Details: [DEPLOY.md](DEPLOY.md), [USER_MANUAL.md](USER_MANUAL.md).

## A. Secrets (once)

On an office PC:

```powershell
powershell -File scripts/Generate-ProdSecrets.ps1 -Show
```

Copy values into:

- VM `services/sync-api/.env` — `SYNC_SECRET`, `REVALIDATE_WEBHOOK_SECRET`, `POSTGRES_PASSWORD`
- Vercel website project — `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, `REVALIDATE_WEBHOOK_SECRET`
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

## D. Publish catalog from ERP

1. Super Admin → Settings → fill real GSTIN / FSSAI / bank (not seed placeholders).
2. Masters: finished SKUs, USP / B2B rates, pack photos.
3. Settings → Website sync: enable, API URL `https://api.yatharthafoods.in`, paste `SYNC_SECRET`.
4. **Publish to website**.
5. Confirm `https://yatharthafoods.in/price-list` and `/products` show SKUs.
6. **Load enquiries** after a test contact form submit.

While ERP is open, flush runs about every 2 minutes (Next scheduler + Electron).

## E. Plant ERP first install (office PC)

1. `npm run dist:win` → install `dist-installer/Yatharth Foods ERP-Setup-*.exe`.
2. Activate the product key on that PC.
3. Sign in as Super Admin; **change** seeded passwords (`Yatharth@123`).
4. Create Admin / Staff users.
5. Company details, items, parties, recipes.
6. Settings → automatic backup to USB or cloud folder; run one backup.
7. Staff walkthrough via in-app **Help** / this user manual.

Unsigned builds show Windows SmartScreen until a code-signing certificate is added.

## F. After go-live (ops)

- Check Settings → Website sync → Load enquiries (or SMTP inbox) daily.
- Re-publish after major catalog changes if the queue was disabled.
- Keep automatic backup enabled.
