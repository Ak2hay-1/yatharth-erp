#!/usr/bin/env bash
set -euo pipefail
cd /opt/yatharth-erp/services/sync-api

# Source secrets
set -a
# shellcheck disable=SC1091
source .env
set +a

# Patch base compose DATABASE_URL to use env password (not hardcoded yatharth:yatharth)
python3 - <<'PY'
from pathlib import Path
import re
p = Path('docker-compose.yml')
t = p.read_text()
t = re.sub(
    r'DATABASE_URL: postgresql://yatharth:yatharth@postgres:5432/yatharth_sync',
    'DATABASE_URL: postgresql://${POSTGRES_USER:-yatharth}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-yatharth_sync}',
    t,
)
p.write_text(t)
print('DATABASE_URL templated')
PY

docker compose -f docker-compose.yml -f docker-compose.shared-vm.yml up -d --force-recreate api
sleep 8
curl -fsS http://127.0.0.1:3001/health; echo
curl -fsS http://127.0.0.1:3001/v1/public/price-list; echo
curl -fsSk https://api.yatharthafoods.in/health; echo
curl -fsSk https://api.yatharthafoods.in/v1/public/price-list; echo

# Reconnect to jersey network after recreate
JERSEY_NET=$(docker inspect jce-caddy --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | head -n1 | tr -d '\r')
docker network connect "$JERSEY_NET" yatharth-sync-api 2>/dev/null || true
docker restart jce-caddy >/dev/null
sleep 4
curl -fsSk https://api.yatharthafoods.in/v1/public/price-list; echo
echo DONE
