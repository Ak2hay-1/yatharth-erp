#!/usr/bin/env bash
# Run on VM after sync-api files are already at /opt/yatharth-erp/services/sync-api
set -euo pipefail

SYNC="/opt/yatharth-erp/services/sync-api"
CADDYFILE="/opt/jersey/infra/docker/Caddyfile"
SECRETS_OUT="/root/yatharth-sync-secrets.env"

cd "$SYNC"
test -f docker-compose.yml
test -f docker-compose.shared-vm.yml

if [[ ! -f .env ]] || grep -q 'CHANGE_ME' .env 2>/dev/null || ! grep -q '^SYNC_SECRET=.\+' .env; then
  SYNC_SECRET="$(openssl rand -hex 32)"
  REVALIDATE_WEBHOOK_SECRET="$(openssl rand -hex 32)"
  POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  cat > .env <<EOF
POSTGRES_USER=yatharth
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=yatharth_sync
DATABASE_URL=postgresql://yatharth:${POSTGRES_PASSWORD}@postgres:5432/yatharth_sync
PORT=3001
HOST=0.0.0.0
SYNC_SECRET=${SYNC_SECRET}
WEBSITE_ORIGIN=https://yatharthafoods.in
UPLOAD_DIR=/data/uploads
VERCEL_REVALIDATE_URL=https://yatharthafoods.in/api/revalidate
REVALIDATE_WEBHOOK_SECRET=${REVALIDATE_WEBHOOK_SECRET}
CONTACT_NOTIFY_TO=accounts@yatharthfoods.in
CONTACT_NOTIFY_FROM=noreply@yatharthafoods.in
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EOF
  chmod 600 .env
  cp .env "$SECRETS_OUT"
  chmod 600 "$SECRETS_OUT"
  echo "Generated $SECRETS_OUT"
fi

ufw allow 80/tcp || true
ufw allow 443/tcp || true

docker compose -f docker-compose.yml -f docker-compose.shared-vm.yml up -d --build
sleep 5
curl -fsS http://127.0.0.1:3001/health
echo

JERSEY_NET="$(docker inspect jce-caddy --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | head -n1 | tr -d '\r')"
echo "Jersey network: ${JERSEY_NET:-none}"
if [[ -n "${JERSEY_NET:-}" ]]; then
  docker network connect "$JERSEY_NET" yatharth-sync-api 2>/dev/null || true
fi

cp -a "$CADDYFILE" "${CADDYFILE}.bak.$(date +%Y%m%d%H%M%S)"
if ! grep -q 'api.yatharthafoods.in' "$CADDYFILE"; then
  cat >> "$CADDYFILE" <<'CADDY'

# Yatharth Foods marketing API (ERP catalog sync)
api.yatharthafoods.in {
	encode gzip
	reverse_proxy yatharth-sync-api:3001
}
CADDY
fi

docker exec jce-caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || docker restart jce-caddy
sleep 3
curl -fsS http://127.0.0.1:3001/health && echo
curl -fsSk https://api.yatharthafoods.in/health && echo || {
  echo "Public HTTPS pending — caddy logs:"
  docker logs jce-caddy --tail 50 || true
}

echo "DONE. Secrets: $SECRETS_OUT"
