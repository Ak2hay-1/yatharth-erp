#!/usr/bin/env bash
set -euo pipefail

echo "== health =="
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:3001/health; then
    echo
    break
  fi
  sleep 2
done

echo "== containers =="
docker ps --format '{{.Names}} {{.Ports}}' | grep yatharth || true

JERSEY_NET=$(docker inspect jce-caddy --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | head -n1 | tr -d '\r')
echo "Jersey network: $JERSEY_NET"
docker network connect "$JERSEY_NET" yatharth-sync-api 2>/dev/null || echo "network already connected or failed"

CADDYFILE=/opt/jersey/infra/docker/Caddyfile
# Ensure Caddy container sees host file — check mount
docker inspect jce-caddy --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}' || true

cp -a "$CADDYFILE" "${CADDYFILE}.bak.$(date +%Y%m%d%H%M%S)"
if ! grep -q 'api.yatharthafoods.in' "$CADDYFILE"; then
  cat >> "$CADDYFILE" <<'EOF'

# Yatharth Foods marketing API (ERP catalog sync)
api.yatharthafoods.in {
	encode gzip
	reverse_proxy yatharth-sync-api:3001
}
EOF
  echo "appended api.yatharthafoods.in block"
else
  echo "api block already present"
fi

echo "== Caddyfile =="
cat "$CADDYFILE"

docker exec jce-caddy caddy reload --config /etc/caddy/Caddyfile 2>&1 || docker restart jce-caddy
sleep 6

echo "== public =="
curl -fsSk https://api.yatharthafoods.in/health
echo
echo DONE
