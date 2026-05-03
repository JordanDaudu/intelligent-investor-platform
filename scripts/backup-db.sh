#!/usr/bin/env bash

set -euo pipefail

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
BACKUP_DIR="${BACKUP_DIR:-backups}"

if [ ! -f "$COMPOSE_FILE" ]; then
  COMPOSE_FILE="docker-compose.yml"
fi

TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
BACKUP_FILE="$BACKUP_DIR/intelligent-investor-${DB_NAME}-${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "Creating PostgreSQL backup..."
echo "Compose file: $COMPOSE_FILE"
echo "Database: $DB_NAME"
echo "Output: $BACKUP_FILE"

docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  > "$BACKUP_FILE"

echo "Backup created successfully:"
echo "$BACKUP_FILE"
