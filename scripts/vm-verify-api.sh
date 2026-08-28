#!/usr/bin/env bash
set -uo pipefail
cd /opt/yatharth-erp/services/sync-api

echo "waiting for api..."
ok=0
for i in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:3001/health >/tmp/h.json 2>/dev/null; then
    cat /tmp/h.json; echo
    ok=1
    break
  fi
  sleep 2
done
if [[ "$ok" != "1" ]]; then
  docker logs yatharth-sync-api --tail 50
  exit 1
fi

echo "local price-list:"
curl -fsS http://127.0.0.1:3001/v1/public/price-list || docker logs yatharth-sync-api --tail 40
echo

JERSEY_NET=$(docker inspect jce-caddy --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | head -n1 | tr -d '\r')
docker network connect "$JERSEY_NET" yatharth-sync-api 2>/dev/null || true
docker exec jce-caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || docker restart jce-caddy
sleep 4

echo "public health:"
curl -fsSk https://api.yatharthafoods.in/health; echo
echo "public price-list:"
curl -fsSk https://api.yatharthafoods.in/v1/public/price-list; echo
echo DONE
