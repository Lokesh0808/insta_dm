#!/bin/bash
# ---------------------------------------------------------------------------
# Instaflow — EC2 user-data bootstrap
#
# Installs Docker + Compose, clones the repository, prepares the environment
# and starts the stack. Secrets are injected from SSM Parameter Store.
# ---------------------------------------------------------------------------
set -euo pipefail

exec > >(tee -a /var/log/instaflow-bootstrap.log) 2>&1

echo "[instaflow] bootstrap started at $(date -u)"

# --- System packages ---------------------------------------------------------
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y \
  ca-certificates curl gnupg git unzip jq \
  docker-ce docker-ce-cli containerd.io docker-compose-plugin \
  mongodump-tools

# --- Docker ------------------------------------------------------------------
systemctl enable --now docker
usermod -aG docker ubuntu || true
systemctl enable --now containerd

# --- Docker daemon hardening -------------------------------------------------
cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" },
  "live-restore": true
}
JSON
systemctl restart docker

# --- CloudWatch agent --------------------------------------------------------
if command -v amazon-cloudwatch-agent >/dev/null 2>&1; then
  amazon-cloudwatch-agent-ctl start
fi

# --- Application -------------------------------------------------------------
APP_DIR=/opt/instaflow
mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ -n "${GIT_REPO:-}" ]; then
  git clone "$GIT_REPO" . || git pull --rebase
else
  echo "[instaflow] GIT_REPO is not set — assuming the code is already present"
fi

# Pull secrets from SSM Parameter Store when available.
if command -v aws >/dev/null 2>&1; then
  aws ssm get-parameter-by-name --name /instaflow/prod/env \
    --with-decryption --query 'Parameter.Value' --output text > .env 2>/dev/null \
    || cp .env.example .env
else
  cp .env.example .env
fi

chmod +x scripts/*.sh

# --- Start -------------------------------------------------------------------
docker compose up -d --build

# --- Wait for health ---------------------------------------------------------
for i in $(seq 1 40); do
  if curl -fsS http://localhost/api/health >/dev/null 2>&1; then
    echo "[instaflow] stack is healthy"
    break
  fi
  sleep 10
done

# --- Nightly backups ---------------------------------------------------------
cat > /etc/cron.d/instaflow-backup <<'CRON'
0 3 * * * root /opt/instaflow/scripts/backup.sh >> /var/log/instaflow-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/instaflow-backup

echo "[instaflow] bootstrap complete at $(date -u)"
