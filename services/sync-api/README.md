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

## Endpoints

### Authenticated (ERP → VM)

Requires headers: `X-Yatharth-Machine-Id`, `X-Yatharth-Timestamp`, `X-Yatharth-Signature`

- `POST /v1/sync/products` — bulk upsert catalog
- `POST /v1/sync/company` — company/contact block
- `POST /v1/sync/assets/:sku` — multipart image upload
- `GET /v1/sync/status` — last sync info

### Public (Website → VM)

- `GET /v1/public/company`
- `GET /v1/public/products?category=veg|non-veg`
- `GET /v1/public/products/:sku`
- `GET /v1/public/price-list`
- `POST /v1/public/contact`

## Production VM

1. Point DNS `api.yatharthafoods.in` to the VM IP.
2. Put nginx/Caddy in front of port 3001 with TLS.
3. Set firewall: allow 443 only; block public PostgreSQL.
4. Use a strong `SYNC_SECRET` — same value goes in ERP Settings → Website sync.

## Vercel revalidation

Set `VERCEL_REVALIDATE_URL` to `https://yatharthafoods.in/api/revalidate` and `REVALIDATE_WEBHOOK_SECRET` to match the website env var. After each sync, the API triggers cache refresh.
