#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Instaflow — MongoDB backup
#
#   ./scripts/backup.sh [--keep 7]
#
# Creates a gzipped mongodump, keeps the last N local copies and (when AWS
# credentials are available) uploads the archive to S3.
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."

KEEP=7
[[ "${1:-}" == "--keep" ]] && KEEP="${2:-7}"

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/instaflow}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_NAME="instaflow-${TIMESTAMP}.archive.gz"
ARCHIVE_PATH="${BACKUP_ROOT}/${ARCHIVE_NAME}"

mkdir -p "$BACKUP_ROOT"

log() { printf "==> %s\n" "$1"; }

# --- Connection details ------------------------------------------------------
if [[ -n "${MONGODB_URI:-}" ]]; then
  URI="$MONGODB_URI"
elif command -v docker >/dev/null 2>&1 && docker compose ps mongodb >/dev/null 2>&1; then
  URI="mongodb://mongodb:27017/${MONGO_DB_NAME:-instaflow}"
else
  echo "Cannot determine the MongoDB connection string." >&2
  exit 1
fi

# --- Dump --------------------------------------------------------------------
log "Creating MongoDB dump"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if command -v mongodump >/dev/null 2>&1; then
  mongodump --uri="$URI" --archive="$ARCHIVE_PATH" --gzip
elif docker compose ps mongodb >/dev/null 2>&1; then
  docker compose exec -T mongodb mongodump \
    --archive --gzip > "$ARCHIVE_PATH"
else
  echo "mongodump is not available and the mongodb container is not running." >&2
  exit 1
fi

[[ -s "$ARCHIVE_PATH" ]] || { echo "Backup archive is empty." >&2; exit 1; }
log "Backup written to ${ARCHIVE_PATH} ($(du -h "$ARCHIVE_PATH" | cut -f1))"

# --- Retention ---------------------------------------------------------------
log "Pruning old backups (keeping the last ${KEEP})"
ls -1t "${BACKUP_ROOT}"/instaflow-*.archive.gz 2>/dev/null \
  | tail -n "+$((KEEP + 1))" \
  | while read -r old; do
      rm -f "$old"
      log "Removed ${old}"
    done

# --- S3 upload ---------------------------------------------------------------
if [[ -n "${AWS_ACCESS_KEY_ID:-}" && -n "${AWS_S3_BUCKET:-}" ]]; then
  if command -v aws >/dev/null 2>&1; then
    log "Uploading to s3://${AWS_S3_BUCKET}/backups/"
    aws s3 cp "$ARCHIVE_PATH" "s3://${AWS_S3_BUCKET}/backups/${ARCHIVE_NAME}" \
      --storage-class STANDARD_IA
    ok=true
  else
    log "AWS CLI not installed — skipping S3 upload"
  fi
else
  log "AWS credentials/bucket not configured — skipping S3 upload"
fi

log "Backup complete"
