#!/usr/bin/env bash
# Bootstrap Yatharth sync-api on the shared Vultr VM (alongside Jersey Commerce).
# Run ON the VM as root:
#   bash /tmp/vm-bootstrap-yatharth-api.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Ak2hay-1/yatharth-erp.git}"
ROOT="/opt/yatharth-erp"
SYNC="$ROOT/services/sync-api"
CADDYFILE="/opt/jersey/infra/docker/Caddyfile"
SECRETS_OUT="/root/yatharth-sync-secrets.env"

echo "==> [1/7] Clone or update repo"
if [[ -d "$ROOT/.git" ]]; then
  git -C "$ROOT" fetch --depth 1 origin main || true
  git -C "$ROOT" reset --hard origin/main || true
else
  rm -rf "$ROOT"
  git clone --depth 1 "$REPO_URL" "$ROOT"
fi

echo "==> [2/7] Ensure sync-api files exist"
cd "$SYNC"
test -f docker-compose.yml
test -f Dockerfile

# Shared-VM compose (no second Caddy) — write if missing from older clones
if [[ ! -f docker-compose.shared-vm.yml ]]; then
  cat > docker-compose.shared-vm.yml <<'YAML'
services:
  postgres:
    container_name: yatharth-sync-postgres
    ports:
      - "127.0.0.1:5433:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-yatharth}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
      POSTGRES_DB: ${POSTGRES_DB:-yatharth_sync}
  api:
    container_name: yatharth-sync-api
    ports:
      - "127.0.0.1:3001:3001"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-yatharth}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-yatharth_sync}
      PORT: "3001"
      HOST: 0.0.0.0
      SYNC_SECRET: ${SYNC_SECRET:?Set SYNC_SECRET in .env}
      WEBSITE_ORIGIN: ${WEBSITE_ORIGIN:-https://yatharthafoods.in}
      UPLOAD_DIR: /data/uploads
      VERCEL_REVALIDATE_URL: ${VERCEL_REVALIDATE_URL:-https://yatharthafoods.in/api/revalidate}
      REVALIDATE_WEBHOOK_SECRET: ${REVALIDATE_WEBHOOK_SECRET:?Set REVALIDATE_WEBHOOK_SECRET in .env}
YAML
fi

echo "==> [3/7] Write .env (generate secrets if missing)"
if [[ ! -f .env ]] || grep -q 'CHANGE_ME' .env 2>/dev/null; then
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
  umask 077
  cp .env "$SECRETS_OUT"
  chmod 600 "$SECRETS_OUT" .env
  echo "Wrote secrets to $SECRETS_OUT (copy SYNC_SECRET into ERP Settings)"
else
  echo "Keeping existing $SYNC/.env"
fi

echo "==> [4/7] Start sync-api + postgres (no Caddy)"
docker compose -f docker-compose.yml -f docker-compose.shared-vm.yml up -d --build
sleep 3
curl -fsS http://127.0.0.1:3001/health
echo

echo "==> [5/7] Attach API container to Jersey Docker network"
JERSEY_NET="$(docker inspect jce-caddy --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' | awk '{print $1}')"
if [[ -z "$JERSEY_NET" ]]; then
  echo "WARN: could not detect jce-caddy network; skipping network connect"
else
  echo "Jersey network: $JERSEY_NET"
  docker network connect "$JERSEY_NET" yatharth-sync-api 2>/dev/null || true
fi

echo "==> [6/7] Add api.yatharthafoods.in to Jersey Caddyfile"
if [[ ! -f "$CADDYFILE" ]]; then
  echo "ERROR: missing $CADDYFILE"
  exit 1
fi
cp -a "$CADDYFILE" "${CADDYFILE}.bak.$(date +%Y%m%d%H%M%S)"
if grep -q 'api.yatharthafoods.in' "$CADDYFILE"; then
  echo "Caddy site already present"
else
  cat >> "$CADDYFILE" <<'CADDY'

# Yatharth Foods marketing API (ERP catalog sync)
api.yatharthafoods.in {
	encode gzip
	reverse_proxy yatharth-sync-api:3001
}
CADDY
fi

# Reload Caddy config
if docker exec jce-caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null; then
  echo "Caddy reloaded"
else
  echo "Reload failed — restarting jce-caddy"
  docker restart jce-caddy
  sleep 2
fi

echo "==> [7/7] Verify"
sleep 2
curl -fsS http://127.0.0.1:3001/health && echo
curl -fsSk https://api.yatharthafoods.in/health && echo || {
  echo "Public HTTPS not ready yet — check: docker logs jce-caddy --tail 40"
  docker logs jce-caddy --tail 40 || true
}

echo
echo "DONE."
echo "Secrets file: $SECRETS_OUT"
echo "Next: put SYNC_SECRET into ERP Settings → Website sync"
echo "      put REVALIDATE_WEBHOOK_SECRET into Vercel website env"
