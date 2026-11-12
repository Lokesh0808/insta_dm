#!/bin/sh
# Renders the runtime configuration consumed by the SPA before nginx starts.
set -e

TARGET="/usr/share/nginx/html/config.js"

cat > "$TARGET" <<EOF
window.__INSTAFLOW_CONFIG__ = {
  API_URL: "${API_URL:-/api}",
  SOCKET_URL: "${SOCKET_URL:-}",
  APP_URL: "${APP_URL:-}",
  APP_NAME: "${APP_NAME:-Instaflow}"
};
EOF

echo "[frontend] runtime config written to $TARGET"

exec nginx -g 'daemon off;'
