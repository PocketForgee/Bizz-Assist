#!/usr/bin/env bash
# Run ON the server, from the repo's deploy/ folder:  ./deploy.sh
# Pulls main, rebuilds the web image on the box (no registry, no local Docker), restarts, prunes old images.
set -euo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo "deploy/.env is missing: cp .env.example .env and fill it in" >&2; exit 1; }
grep -q '^APP_ENCRYPTION_KEY=.\{64\}$' .env || echo "warning: APP_ENCRYPTION_KEY is not 64 hex chars; API Actions with headers will fail" >&2

git pull --ff-only
# 1 GB RAM box: build first (uses swap), then swap containers, so the running app stays up during the build
docker compose build web
docker compose up -d
docker image prune -f >/dev/null

echo "waiting for the app..."
for _ in $(seq 1 30); do
  if docker compose exec -T web node -e "fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "up: https://$(grep '^DOMAIN=' .env | cut -d= -f2)"
    exit 0
  fi
  sleep 2
done
echo "the app did not answer in 60 s; check: docker compose logs --tail=100 web" >&2
exit 1
