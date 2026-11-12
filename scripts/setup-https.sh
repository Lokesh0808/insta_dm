#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Instaflow — HTTPS setup with Let's Encrypt (certbot, webroot mode)
#
#   sudo ./scripts/setup-https.sh your-domain.com admin@example.com
# ---------------------------------------------------------------------------
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Usage: $0 <domain> <email>" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

log() { printf "==> %s\n" "$1"; }

log "Installing certbot"
if ! command -v certbot >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y certbot
  elif command -v yum >/dev/null 2>&1; then
    yum install -y certbot
  else
    echo "Unsupported package manager — install certbot manually." >&2
    exit 1
  fi
fi

log "Requesting the certificate for ${DOMAIN}"
docker compose exec -T nginx mkdir -p /var/www/certbot
docker compose exec -T nginx certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

log "Copying the certificate into the shared volume"
mkdir -p ./nginx/certs
docker compose cp nginx:/etc/letsencrypt/live/"$DOMAIN"/fullchain.pem ./nginx/certs/fullchain.pem
docker compose cp nginx:/etc/letsencrypt/live/"$DOMAIN"/privkey.pem ./nginx/certs/privkey.pem

log "Updating the compose file to mount the certificate"
if ! grep -q "nginx/certs" docker-compose.yml; then
  sed -i 's#- ./nginx/conf.d/10-https.conf.template#- ./nginx/certs:/etc/nginx/certs:ro\n      - ./nginx/conf.d/10-https.conf.template#' docker-compose.yml
fi

log "Setting NGINX_SERVER_NAME in .env"
if grep -q '^NGINX_SERVER_NAME=' .env; then
  sed -i "s#^NGINX_SERVER_NAME=.*#NGINX_SERVER_NAME=${DOMAIN}#" .env
else
  echo "NGINX_SERVER_NAME=${DOMAIN}" >> .env
fi

log "Adding the certificate renewal hook"
( crontab -l 2>/dev/null | grep -v certbot || true; \
  echo "0 3 * * * cd $(pwd) && docker compose exec -T nginx certbot renew --quiet && docker compose restart nginx" ) \
  | crontab -

log "Restarting nginx"
docker compose up -d --force-recreate nginx

echo ""
echo "HTTPS is live at https://${DOMAIN}"
