# ---------------------------------------------------------------------------
# Instaflow edge proxy — nginx + OpenSSL (self-signed certificate fallback)
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine

RUN apk add --no-cache openssl curl tzdata

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
  CMD curl -fsS http://127.0.0.1/ >/dev/null || exit 1

ENTRYPOINT ["/bin/sh", "/docker-entrypoint.sh"]
