#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Instaflow — production deployment script (AWS EC2 / any Docker host)
#
#   ./scripts/deploy.sh [--skip-build]
#
# Builds the images, starts the stack, waits for every container to become
# healthy and installs the nightly backup cron entry.
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."

SKIP_BUILD=0
[[ "${1:-}" == "--skip-build" ]] && SKIP_BUILD=1

BLUE='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { printf "${BLUE}==>${NC} %s\n" "$1"; }
ok()   { printf "${GREEN}  ✓${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}  !${NC} %s\n" "$1"; }
fail() { printf "${RED}  ✗${NC} %s\n" "$1"; exit 1; }

# --- Preflight ---------------------------------------------------------------
log "Checking prerequisites"
command -v docker >/dev/null 2>&1 || fail "Docker is not installed"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is not available"
[[ -f .env ]] || fail ".env is missing — run: cp .env.example .env"

# Required secrets
for var in JWT_ACCESS_SECRET JWT_REFRESH_SECRET ENCRYPTION_KEY; do
  value=$(grep -E "^${var}=" .env | cut -d= -f2- || true)
  [[ -n "$value" && "$value" != "change_me"* && "$value" != "0123456789abcdef"* ]] \
    || fail "$var is not configured in .env"
done
ok "Environment validated"

# --- Build -------------------------------------------------------------------
if [[ "$SKIP_BUILD" -eq 0 ]]; then
  log "Building images"
  docker compose build --pull
  ok "Images built"
fi

# --- Start -------------------------------------------------------------------
log "Starting services"
docker compose up -d --remove-orphans
ok "Services started"

# --- Health wait -------------------------------------------------------------
log "Waiting for health checks"
HEALTH_TIMEOUT=180
elapsed=0
while [[ $elapsed -lt $HEALTH_TIMEOUT ]]; do
  unhealthy=$(docker compose ps --format '{{.Service}} {{.Health}}' \
    | awk '$2 != "healthy" && $2 != "" {print $1}' | tr '\n' ' ')

  if [[ -z "$unhealthy" ]]; then
    ok "All services are healthy"
    break
  fi

  printf "    waiting… (%ds) pending: %s\n" "$elapsed" "$unhealthy"
  sleep 5
  elapsed=$((elapsed + 5))
done

[[ -z "${unhealthy:-}" ]] || fail "Services did not become healthy: $unhealthy"

# --- API smoke test ----------------------------------------------------------
log "Running API health check"
if curl -fsS "http://localhost/api/health" >/dev/null 2>&1; then
  ok "API is responding"
else
  warn "API health check failed — check: docker compose logs backend"
fi

# --- Backups -----------------------------------------------------------------
log "Installing nightly backup schedule"
CRON_FILE="/etc/cron.d/instaflow-backup"
if [[ "$(id -u)" -eq 0 ]]; then
  cat > "$CRON_FILE" <<'CRON'
0 3 * * * root /opt/instaflow/scripts/backup.sh >> /var/log/instaflow-backup.log 2>&1
CRON
  chmod 644 "$CRON_FILE"
  ok "Backup cron installed at 03:00 daily"
else
  warn "Not running as root — install the backup cron manually:"
  warn "  0 3 * * * $(pwd)/scripts/backup.sh >> /var/log/instaflow-backup.log 2>&1"
fi

# --- Summary -----------------------------------------------------------------
echo ""
log "Deployment complete"
docker compose ps
echo ""
ok "Dashboard:  $(grep -E '^CLIENT_URL=' .env | cut -d= -f2- || echo 'http://localhost')/dashboard"
ok "API docs:  $(grep -E '^CLIENT_URL=' .env | cut -d= -f2- || echo 'http://localhost')/api/docs"
ok "Admin:     $(grep -E '^CLIENT_URL=' .env | cut -d= -f2- || echo 'http://localhost')/admin"
echo ""
