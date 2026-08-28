#!/usr/bin/env bash
set -euo pipefail
cd /opt/yatharth-erp/services/sync-api

# Lock published ports to localhost only
python3 - <<'PY'
from pathlib import Path
p = Path('docker-compose.yml')
t = p.read_text()
t = t.replace('"5433:5432"', '"127.0.0.1:5434:5432"')
t = t.replace('"3001:3001"', '"127.0.0.1:3001:3001"')
p.write_text(t)
print('compose ports locked to localhost')
PY

docker compose -f docker-compose.yml -f docker-compose.shared-vm.yml up -d
sleep 3
curl -fsS http://127.0.0.1:3001/health
echo

JERSEY_NET=$(docker inspect jce-caddy --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | head -n1 | tr -d '\r')
echo "Jersey network: $JERSEY_NET"
docker network connect "$JERSEY_NET" yatharth-sync-api 2>/dev/null || true

CADDYFILE=/opt/jersey/infra/docker/Caddyfile
cp -a "$CADDYFILE" "${CADDYFILE}.bak.$(date +%Y%m%d%H%M%S)"
if ! grep -q 'api.yatharthafoods.in' "$CADDYFILE"; then
  cat >> "$CADDYFILE" <<'EOF'

# Yatharth Foods marketing API (ERP catalog sync)
api.yatharthafoods.in {
	encode gzip
	reverse_proxy yatharth-sync-api:3001
}
EOF
fi

echo '--- Caddyfile ---'
cat "$CADDYFILE"
docker exec jce-caddy caddy reload --config /etc/caddy/Caddyfile || docker restart jce-caddy
sleep 5
echo '--- public health ---'
curl -fsSk https://api.yatharthafoods.in/health
echo
echo DONE
