#!/usr/bin/env bash

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: ./scripts/restore-db.sh path/to/backup.sql"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Load .env if it exists, so custom DB names/users can be reused.
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.images.yml}"
DB_SERVICE="${DB_SERVICE:-postgres}"
DB_USER="${POSTGRES_USER:-investor_user}"
DB_NAME="${POSTGRES_DB:-investor_db}"

if [ ! -f "$COMPOSE_FILE" ]; then
  COMPOSE_FILE="docker-compose.yml"
fi

echo "Restore target:"
echo "Compose file: $COMPOSE_FILE"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""
echo "WARNING: This restore may replace existing database tables and data."
echo "Type RESTORE to continue:"
read -r CONFIRMATION

if [ "$CONFIRMATION" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 0
fi

cat "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" psql \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -v ON_ERROR_STOP=1

echo "Restore completed successfully from:"
echo "$BACKUP_FILE"
