#!/bin/sh
# ---------------------------------------------------------------------------
# Instaflow nginx entrypoint.
#
# 1. Ensures a TLS certificate exists (Let's Encrypt mount, or a generated
#    self-signed certificate for local development).
# 2. Renders the HTTPS server block into /etc/nginx/generated/.
# 3. Starts nginx.
# ---------------------------------------------------------------------------
set -e

GENERATED_DIR="/etc/nginx/generated"
SSL_DIR="/etc/nginx/ssl"
LETSENCRYPT_DIR="/etc/letsencrypt/live/instaflow.com"
TEMPLATE="/etc/nginx/templates/10-https.conf.template"

mkdir -p "$GENERATED_DIR" "$SSL_DIR" /var/www/certbot

# Remove the stock "Welcome to nginx" site so only our server blocks are active.
rm -f /etc/nginx/conf.d/default.conf

SERVER_NAME="${NGINX_SERVER_NAME:-_}"

# --- 1. Locate a usable certificate ---------------------------------------
CERT_PATH=""
KEY_PATH=""

if [ -f "$LETSENCRYPT_DIR/fullchain.pem" ] && [ -f "$LETSENCRYPT_DIR/privkey.pem" ]; then
  CERT_PATH="$LETSENCRYPT_DIR/fullchain.pem"
  KEY_PATH="$LETSENCRYPT_DIR/privkey.pem"
  echo "[nginx] using Let's Encrypt certificate from $LETSENCRYPT_DIR"
elif [ -f "${SSL_CERT_PATH:-}" ] && [ -f "${SSL_KEY_PATH:-}" ]; then
  CERT_PATH="$SSL_CERT_PATH"
  KEY_PATH="$SSL_KEY_PATH"
  echo "[nginx] using configured certificate $CERT_PATH"
else
  # --- 2. Generate a self-signed certificate (development fallback) --------
  SELF_CERT="$SSL_DIR/fullchain.pem"
  SELF_KEY="$SSL_DIR/privkey.pem"
  if [ ! -f "$SELF_CERT" ] || [ ! -f "$SELF_KEY" ]; then
    echo "[nginx] no TLS certificate found — generating a self-signed one"
    if openssl req -x509 -nodes -newkey rsa:2048 \
      -keyout "$SELF_KEY" \
      -out "$SELF_CERT" \
      -days 365 \
      -subj "/CN=${SERVER_NAME}" \
      -addext "subjectAltName=DNS:${SERVER_NAME},DNS:localhost,IP:127.0.0.1" \
      >/dev/null 2>&1; then
      echo "[nginx] self-signed certificate generated"
    else
      echo "[nginx] WARNING: unable to generate a self-signed certificate — HTTP only" >&2
    fi
  fi

  if [ -f "$SELF_CERT" ] && [ -f "$SELF_KEY" ]; then
    CERT_PATH="$SELF_CERT"
    KEY_PATH="$SELF_KEY"
    echo "[nginx] using self-signed certificate (development only)"
  fi
fi

# --- 3. Render the HTTPS server block --------------------------------------
if [ -n "$CERT_PATH" ] && [ -f "$TEMPLATE" ]; then
  SSL_CERT_PATH="$CERT_PATH" SSL_KEY_PATH="$KEY_PATH" NGINX_SERVER_NAME="$SERVER_NAME" \
    envsubst '$NGINX_SERVER_NAME $SSL_CERT_PATH $SSL_KEY_PATH' \
    < "$TEMPLATE" > "$GENERATED_DIR/10-https.conf"
  echo "[nginx] HTTPS server rendered"
else
  echo "[nginx] HTTPS listener disabled (no certificate available)"
fi

# --- 4. Validate and start ---------------------------------------------------
nginx -t
exec nginx -g 'daemon off;'
