#!/usr/bin/env bash
# Restore a MySQL dump and, optionally, the media volume from a backup created
# by docker/backup.sh.
#
# Usage: docker/restore.sh --yes <mysql-dump.sql.gz> [uploads.tar.gz]
#
# Nginx and the frontend are stopped for the duration of the restore so no
# traffic is served from a partially restored state. MySQL and the backend
# stay up. A maintenance window is required; this is not an online restore.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CONFIRMED=false
if [[ "${1:-}" == "--yes" ]]; then
  CONFIRMED=true
  shift
fi
DUMP_FILE="${1:-}"
UPLOADS_FILE="${2:-}"

if [[ "$CONFIRMED" != true ]]; then
  echo "Refusing to restore without --yes: this overwrites the live database." >&2
  echo "Usage: docker/restore.sh --yes <mysql-dump.sql.gz> [uploads.tar.gz]" >&2
  exit 2
fi
if [[ -z "$DUMP_FILE" || ! -f "$DUMP_FILE" ]]; then
  echo "MySQL dump not found: ${DUMP_FILE:-<missing>}" >&2
  exit 2
fi
if [[ -n "$UPLOADS_FILE" && ! -f "$UPLOADS_FILE" ]]; then
  echo "Uploads archive not found: $UPLOADS_FILE" >&2
  exit 2
fi

CHECKSUMS="${DUMP_FILE%-mysql.sql.gz}-sha256sums.txt"
verify_checksum() {
  local file="$1"
  local expected actual
  expected="$(grep -F " $(basename "$file")" "$CHECKSUMS" | awk '{print $1}')"
  actual="$(sha256sum "$file" | awk '{print $1}')"
  if [[ -z "$expected" || "$expected" != "$actual" ]]; then
    echo "Checksum mismatch for $file" >&2
    exit 1
  fi
}
if [[ -f "$CHECKSUMS" ]]; then
  echo "Verifying backup checksums"
  verify_checksum "$DUMP_FILE"
  if [[ -n "$UPLOADS_FILE" ]]; then
    verify_checksum "$UPLOADS_FILE"
  fi
fi

cd "$ROOT_DIR"

echo "Stopping nginx and frontend to stop serving traffic"
docker compose stop nginx frontend

cleanup() {
  echo "Starting nginx and frontend again"
  docker compose start nginx frontend
}
trap cleanup EXIT

echo "Restoring MySQL from $DUMP_FILE"
gunzip -c "$DUMP_FILE" | docker compose exec -T mysql sh -c \
  'exec mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'

if [[ -n "$UPLOADS_FILE" ]]; then
  echo "Restoring media uploads from $UPLOADS_FILE"
  docker compose exec -T backend sh -c 'find /app/uploads -mindepth 1 -delete'
  docker compose exec -T backend tar -xzf - -C /app/uploads < "$UPLOADS_FILE"
  docker compose exec -T backend sh -c \
    'find /app/uploads -type d -exec chmod 755 {} +; find /app/uploads -type f -exec chmod 644 {} +'
fi

echo "Restore complete; current migration revision:"
docker compose exec -T backend alembic current
