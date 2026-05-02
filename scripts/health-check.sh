#!/usr/bin/env bash
# Probe the backend /health endpoint and exit non-zero if it isn't 200.
# Usage: BACKEND_URL=http://localhost:8000 ./scripts/health-check.sh
set -euo pipefail

URL="${BACKEND_URL:-http://localhost:8000}/health"
attempts="${HEALTH_ATTEMPTS:-10}"
sleep_seconds="${HEALTH_SLEEP:-3}"

echo "==> Checking ${URL}"
for i in $(seq 1 "$attempts"); do
  if response=$(curl -fsS "$URL" 2>/dev/null); then
    echo "    OK ($i/$attempts): $response"
    exit 0
  fi
  echo "    waiting... ($i/$attempts)"
  sleep "$sleep_seconds"
done

echo "ERROR: ${URL} did not return 200 after ${attempts} attempts."
exit 1
