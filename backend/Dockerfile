# ==========================================================================
# Instaflow — Backend Dockerfile (multi-stage)
# ==========================================================================

# ---------- Stage 1: dependencies -----------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++ && \
    npm install -g npm@10 && \
    npm cache clean --force
COPY backend/package*.json ./
RUN npm ci --include=dev

# ---------- Stage 2: build --------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build && npm prune --omit=dev

# ---------- Stage 3: production runtime -------------------------------------
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache curl wget tini && \
    addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S nodejs -G nodejs
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs backend/package.json ./package.json

RUN mkdir -p /app/uploads /app/logs && chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]

# ---------- Stage 4: development (hot reload) ------------------------------
FROM node:20-alpine AS development
WORKDIR /app
ENV NODE_ENV=development
RUN apk add --no-cache libc6-compat
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
EXPOSE 3000
CMD ["npm", "run", "dev"]
