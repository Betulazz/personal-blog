#!/usr/bin/env bash
# Back up the MySQL database and the media volume of a running deployment.
#
# Usage: docker/backup.sh [output-directory]
#
# The stack must be running (docker compose up -d). The script writes a
# timestamped dump, an uploads archive, and a manifest with checksums into
# the output directory (default: ./backups, gitignored).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PREFIX="$OUTPUT_DIR/$STAMP"

mkdir -p "$OUTPUT_DIR"
cd "$ROOT_DIR"

echo "Backing up MySQL to $PREFIX-mysql.sql.gz"
docker compose exec -T mysql sh -c \
  'exec mysqldump --single-transaction --routines --triggers --events \
  --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip > "$PREFIX-mysql.sql.gz"

echo "Backing up media uploads to $PREFIX-uploads.tar.gz"
docker compose exec -T backend tar -czf - -C /app/uploads . > "$PREFIX-uploads.tar.gz"

REVISION="$(docker compose exec -T backend alembic current 2>/dev/null | tr -d '\r' | tail -n 1)"
{
  echo "created_at=$STAMP"
  echo "alembic_revision=${REVISION:-unknown}"
  echo "compose_project=personal-blog"
} > "$PREFIX-manifest.txt"

(
  cd "$OUTPUT_DIR"
  sha256sum "$(basename "$PREFIX")-mysql.sql.gz" "$(basename "$PREFIX")-uploads.tar.gz" \
    > "$(basename "$PREFIX")-sha256sums.txt"
)

echo "Backup complete:"
ls -1 "$PREFIX"*
