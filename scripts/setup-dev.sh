#!/usr/bin/env bash
# Idempotent local dev bootstrap.
# - Copies .env.example -> .env if missing
# - Installs backend & frontend deps
# - Generates the Prisma client
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Intelligent Investor Platform — dev setup"

if [ ! -f .env ]; then
  echo "    Creating .env from .env.example"
  cp .env.example .env
else
  echo "    .env already present (leaving it alone)"
fi

echo "==> Installing backend deps"
( cd backend && npm install --no-audit --no-fund )

echo "==> Generating Prisma client"
( cd backend && npx prisma generate )

echo "==> Installing frontend deps"
( cd frontend && npm install --no-audit --no-fund )

echo "==> Done."
echo
echo "Next steps:"
echo "  - Start everything via Docker:   docker compose up --build"
echo "  - Or run locally:                npm --prefix backend run start:dev   (in one shell)"
echo "                                  npm --prefix frontend run dev        (in another)"
