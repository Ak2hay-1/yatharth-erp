# Yatharth Sync API

VM-hosted backend that receives catalog pushes from the local ERP and serves read-only data to the Vercel marketing website.

## Quick start (Docker)

```bash
cd services/sync-api
cp .env.example .env
# Edit SYNC_SECRET, WEBSITE_ORIGIN, optional Vercel revalidate vars
docker compose up -d --build
curl http://localhost:3001/health
```

Production (TLS via Caddy):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Requires Cloudflare **A** `api` → VM IP, **DNS only** (grey cloud). See `docs/DEPLOY.md`.

## Endpoints

### Authenticated (ERP → VM)

Requires headers: `X-Yatharth-Machine-Id`, `X-Yatharth-Timestamp`, `X-Yatharth-Signature`

- `POST /v1/sync/products` — bulk upsert catalog
- `POST /v1/sync/company` — company/contact block
- `POST /v1/sync/assets/:sku` — multipart image upload
- `DELETE /v1/sync/assets/:sku` — clear images for a SKU before re-upload
- `GET /v1/sync/status` — last sync info
- `GET /v1/sync/inquiries` — website contact enquiries (ERP inbox)

### Public (Website → VM)

- `GET /v1/public/company`
- `GET /v1/public/products?category=veg|non-veg`
- `GET /v1/public/products/:sku`
- `GET /v1/public/price-list`
- `POST /v1/public/contact` — stores enquiry; emails `CONTACT_NOTIFY_TO` when SMTP is set

## Production VM

1. Point DNS `api.yatharthafoods.in` to the VM IP (**DNS only**).
2. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`
3. Set firewall: allow 80/443; do not publish PostgreSQL.
4. Use a strong `SYNC_SECRET` — same value goes in ERP Settings → Website sync.
5. Optional SMTP: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_NOTIFY_TO`, `CONTACT_NOTIFY_FROM`.

## Vercel revalidation

Set `VERCEL_REVALIDATE_URL` to `https://yatharthafoods.in/api/revalidate` and `REVALIDATE_WEBHOOK_SECRET` to match the website env var. After each sync, the API triggers cache refresh.
