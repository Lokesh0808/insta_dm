#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Instaflow — restore a MongoDB backup
#
#   ./scripts/restore.sh /var/backups/instaflow/instaflow-20260101-030000.archive.gz
#
# WARNING: this replaces the current contents of the database.
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."

ARCHIVE="${1:-}"
if [[ -z "$ARCHIVE" || ! -f "$ARCHIVE" ]]; then
  echo "Usage: $0 <path-to-archive.gz>" >&2
  exit 1
fi

echo "=========================================================="
echo "  This will DROP and restore the Instaflow database"
echo "  Archive: $ARCHIVE"
echo "=========================================================="
read -r -p "Type 'restore' to continue: " CONFIRM
[[ "$CONFIRM" == "restore" ]] || { echo "Aborted."; exit 1; }

if command -v mongorestore >/dev/null 2>&1; then
  mongorestore --uri="${MONGODB_URI:-mongodb://127.0.0.1:27017/instaflow}" \
    --archive="$ARCHIVE" --gzip --drop
else
  docker compose exec -T mongodb mongorestore --archive --gzip --drop < "$ARCHIVE"
fi

echo "Restore complete."
echo "Restart the API: docker compose restart backend"
