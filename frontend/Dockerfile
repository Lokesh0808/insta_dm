# ==========================================================================
# Instaflow — Frontend Dockerfile (multi-stage)
# ==========================================================================

# ---------- Stage 1: dependencies -----------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
RUN npm cache clean --force
COPY frontend/package*.json ./
RUN npm ci

# ---------- Stage 2: build --------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=
ARG APP_NAME=Instaflow
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV APP_NAME=$APP_NAME
RUN npm run build

# ---------- Stage 3: production runtime -------------------------------------
FROM nginx:1.27-alpine AS production
ENV API_URL=/api \
    SOCKET_URL= \
    APP_URL=http://localhost \
    APP_NAME=Instaflow
RUN apk add --no-cache gettext envsubst
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
  CMD wget --spider -q http://127.0.0.1/ || exit 1
ENTRYPOINT ["/docker-entrypoint.sh"]

# ---------- Stage 4: development (Vite dev server) -------------------------
FROM node:20-alpine AS development
WORKDIR /app
ENV NODE_ENV=development
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
