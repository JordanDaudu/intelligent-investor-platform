#!/usr/bin/env bash
# Run the backend and frontend test suites.
# Usage: ./scripts/run-tests.sh [--e2e]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

run_e2e=false
for arg in "$@"; do
  case "$arg" in
    --e2e) run_e2e=true ;;
  esac
done

echo "==> Backend unit tests"
( cd backend && npm test -- --runInBand )

if [ "$run_e2e" = true ]; then
  echo "==> Backend integration tests (requires DATABASE_URL)"
  ( cd backend && npm run test:e2e )
fi

echo "==> Frontend component tests"
( cd frontend && npm test )

echo "==> All tests passed."
