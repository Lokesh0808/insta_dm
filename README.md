# Instaflow — Instagram Automation SaaS

A production-ready, multi-tenant Instagram automation platform built on the **official Meta
Instagram Graph API** and **Instagram Messaging API**. Instaflow automates DMs, comment-to-DM
flows, story replies, lead collection, link-in-bio pages, analytics and subscription billing.

> **Official APIs only.** No scraping, no browser automation, no Instagram password login.
> Access tokens are encrypted at rest and never reach the browser.

---

## Table of contents

1. [Architecture](#architecture)
2. [Feature overview](#feature-overview)
3. [Tech stack](#tech-stack)
4. [Quick start with Docker](#quick-start-with-docker)
5. [Environment variables](#environment-variables)
6. [Meta / Instagram app setup](#meta--instagram-app-setup)
7. [Project structure](#project-structure)
8. [API reference](#api-reference)
9. [Local development](#local-development)
10. [Testing](#testing)
11. [Security](#security)
12. [Deployment on AWS](#deployment-on-aws)
13. [Plans & limits](#plans--limits)
14. [Troubleshooting](#troubleshooting)

---

## Architecture

Instaflow is a **modular monolith** — one deployable API with clean internal boundaries. This keeps
AWS hosting costs low while remaining easy to split into services later.

```
┌──────────────────────────────────────────────────────────────────────┐
│                          AWS / CloudFront                            │
│                              Route 53 + ACM                           │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ HTTPS
                    ┌────────────▼────────────┐
                    │   Nginx (edge proxy)    │
                    │  TLS · rate limits ·    │
                    │   static caching        │
                    └──────┬───────────┬──────┘
                           │           │
              /api/*       │           │  /*
        ┌──────────────────▼──┐   ┌────▼──────────────────────┐
        │  Node.js + Express  │   │   React SPA (nginx)      │
        │  TypeScript · JWT   │   │   Vite · Tailwind · RSC  │
        │  Socket.IO · BullMQ │   └───────────────────────────┘
        └───────┬────────┬────┘
                │        │
       ┌────────▼──┐  ┌──▼───────────┐
       │  MongoDB  │  │    Redis     │
       │  Atlas /  │  │ cache +      │
       │  self-host│  │ BullMQ broker│
       └───────────┘  └──────────────┘
                     │
             ┌───────▼────────┐        ┌──────────────────┐
             │  Meta Graph API│        │  Razorpay API    │
             │  messaging,    │        │  orders, subs,   │
             │  comments,     │        │  webhooks        │
             │  webhooks      │        └──────────────────┘
             └────────────────┘
```

**Request flow for an inbound DM**

1. Meta posts a `messaging` event to `POST /api/webhooks/instagram`.
2. The webhook is stored in `WebhookEvent` (idempotency via `externalId`) and the HTTP response
   returns `200` immediately so Meta never retries.
3. The matching automation is resolved by priority, then the reply is enqueued in BullMQ.
4. The worker renders the template, sends the message through the Instagram Messaging API and
   records the `Message`, `AutomationExecution` and (optionally) `Lead`.
5. Usage counters increment and a Socket.IO event is pushed to the dashboard.

### Multi-tenancy

Every collection that belongs to a customer carries a `workspace` reference. All queries are
scoped by `workspace: req.auth.workspaceId`, which is derived from the verified JWT — never from
the request body. A dedicated `tenant` guard rejects cross-workspace access.

---

## Feature overview

| Area | What is included |
| --- | --- |
| **Authentication** | Register, email verification, login, refresh/logout, forgot + reset password, Google OAuth, session management, bcrypt hashing, RBAC |
| **Instagram** | Meta OAuth, token encryption + refresh, profile sync, disconnect, webhook verification, messaging & comment webhooks |
| **Automations** | Keyword auto-DM (exact / partial / starts-with / contains / regex), comment-to-DM, story replies, welcome DMs, priority rules, fallback messages, buttons, delay, visual workflow builder |
| **Leads** | Auto capture of username / name / email / phone, search, filters, tags, statuses, CSV export |
| **Link-in-bio** | Custom pages, 5 themes, custom colours, background images, social links, publish/unpublish, click analytics |
| **Analytics** | Overview cards, DM volume, trigger breakdown, top keywords, lead conversion, real-time Socket.IO updates |
| **Billing** | Razorpay checkout (monthly / yearly), **server-side payment verification**, webhook-driven subscription updates, upgrades, downgrades, cancellation, usage limits, invoices, billing history |
| **Admin** | MRR / ARR, users, subscriptions, payments, account suspension, usage monitoring, system health |
| **Security** | Helmet, CORS, rate limiting, Zod validation, NoSQL-injection guard, AES-256-GCM token encryption, CSRF double-submit, audit logging, tenant isolation |

---

## Tech stack

**Frontend** — React 18 · Vite 5 · TypeScript · Tailwind CSS 3 · shadcn-style Radix UI ·
React Router 6 · Zustand · TanStack Query · Axios · Recharts · React Flow (`@xyflow/react`) ·
Framer Motion · Sonner

**Backend** — Node.js 20 · Express 4 · TypeScript · Mongoose 8 · MongoDB 7 · Redis 7 ·
BullMQ · Socket.IO · Zod · Pino · Swagger UI · Razorpay SDK · AWS SDK v3

**Infrastructure** — Docker (multi-stage builds) · Docker Compose · Nginx · MongoDB · Redis ·
AWS EC2 / ECS · S3 · Route 53 · ACM · CloudWatch

---

## Quick start with Docker

### Prerequisites

- Docker Engine 24+ and Docker Compose v2
- At least 4 GB of RAM available to Docker

### 1. Configure the environment

```bash
cp .env.example .env
```

Generate strong secrets:

```bash
# JWT secrets (32+ chars each)
openssl rand -base64 48

# AES-256 key for encrypting Meta access tokens (64 hex chars)
openssl rand -hex 32
```

Paste them into `.env`. At minimum change:

```dotenv
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
ENCRYPTION_KEY=...
```

### 2. Start the stack

```bash
docker compose up -d --build
```

### 3. Check the health of every service

```bash
docker compose ps
```

```
NAME                  IMAGE                        STATUS          PORTS
instaflow-backend     instaflow-backend            Up (healthy)    0.0.0.0:4000->3000/tcp
instaflow-frontend    instaflow-frontend           Up (healthy)    80/tcp
instaflow-mongodb     mongo:7.0                    Up (healthy)    27017/tcp
instaflow-nginx       nginx:1.27-alpine            Up (healthy)    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
instaflow-redis       redis:7.2-alpine             Up (healthy)    6379/tcp
```

### 4. Follow the logs

```bash
docker compose logs -f
# or just one service
docker compose logs -f backend
```

### 5. Open the app

| URL | Description |
| --- | --- |
| http://localhost | Marketing site (served through nginx) |
| http://localhost/dashboard | Dashboard (sign in required) |
| http://localhost/admin | Platform admin panel |
| http://localhost/api/docs | Swagger API documentation |
| http://localhost/api/health | Health probe |

The **platform super-admin** is created automatically on first boot using `ADMIN_EMAIL` and
`ADMIN_PASSWORD` from `.env`.

### 6. (Optional) Seed demo data

```bash
docker compose exec -T backend node dist/scripts/seed.js
```

This creates a demo workspace with `demo@instaflow.local` / `Demo@12345`
(3 automations, 2 Instagram accounts, 5 conversations, 5 leads, a published
link-in-bio page and 30 days of usage counters).

The platform super-admin is `admin@instaflow.local` / `Admin@12345`
(configurable via `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

### 7. Verify the stack end-to-end

```bash
./scripts/smoke-test.sh
```

```
──────────────────────────────────────────────────────────────
✓ 28 checks passed — the stack is fully operational
──────────────────────────────────────────────────────────────
```

The script exercises registration, login, token refresh, protected routes,
Instagram connect, automations, leads, conversations, analytics, billing,
webhook verification, link-in-bio and tenant isolation against the running
stack.

### Useful commands

```bash
docker compose up -d --build      # build + start everything
docker compose ps                 # service health
docker compose logs -f            # stream logs
docker compose restart backend    # restart a single service
docker compose down               # stop (keeps volumes)
docker compose down -v            # stop and delete volumes
docker compose exec backend sh    # shell inside the backend container
```

---

## Environment variables

The full template lives in [`.env.example`](./.env.example). Key groups:

| Group | Variables |
| --- | --- |
| App | `NODE_ENV`, `PORT`, `LOG_LEVEL`, `APP_NAME`, `CLIENT_URL`, `API_URL`, `APP_BASE_URL` |
| MongoDB | `MONGODB_URI`, `MONGO_DB_NAME` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_URL` |
| Auth | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `ENCRYPTION_KEY`, `COOKIE_SECURE`, `CORS_ORIGINS` |
| Meta | `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_VERSION`, `META_REDIRECT_URI`, `META_WEBHOOK_VERIFY_TOKEN`, `META_SCOPES`, `META_APP_MODE` |
| CORS | `CORS_ORIGINS` — see below |
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| Storage | `STORAGE_DRIVER` (`local`\|`s3`), `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_S3_PUBLIC_URL` |
| Limits | `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `WEBHOOK_RATE_LIMIT_MAX` |
| Admin | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_PANEL_ENABLED` |

> **Never commit `.env`.** It is already listed in `.gitignore` and `.dockerignore`.

### A note on `CORS_ORIGINS`

Behind the bundled Nginx proxy the SPA and the API are served from the **same
origin**, so the app works out of the box on any hostname (`localhost`, a
server IP, a custom domain). The API always allows a request whose `Origin`
matches the host that served the page.

`CORS_ORIGINS` is only needed for **additional** origins hosted on a different
domain — for example a separate marketing site calling the API. Use `*` to
allow every origin (never do this on a production deployment that uses
credentials).

A request from an origin that is not allowed is rejected with a clear
`403 FORBIDDEN`, never a `500`.

---

## Meta / Instagram app setup

Instaflow uses **only** the official Meta APIs. To connect real Instagram accounts you need a Meta
Developer app.

1. **Create the app** at <https://developers.facebook.com/apps> → *Business* → *Instagram API with
   Instagram Login*.
2. **Add the permissions** your use case requires:
   - `instagram_basic` — read the Instagram profile
   - `instagram_manage_messages` — send and receive DMs (required for keyword automation)
   - `instagram_manage_comments` — comment-to-DM and comment moderation
   - `instagram_manage_insights` — analytics (optional)
   - `pages_show_list`, `pages_read_engagement` — locate the linked Facebook Page
3. **Products** → add *Instagram* and configure the OAuth redirect URI:
   `https://your-domain.com/api/instagram/callback`
4. **Webhooks** → subscribe to the Instagram account with:
   - Callback URL: `https://your-domain.com/api/webhooks/instagram`
   - Verify token: the value of `META_WEBHOOK_VERIFY_TOKEN`
   - Subscribe to `messages`, `comments` and `follows`
5. **App review** — for customers other than your own Meta account, submit the app for review with
   the permissions above and a screen recording of the product flow.
6. Set `META_APP_ID`, `META_APP_SECRET` and `META_REDIRECT_URI` in `.env`, then restart the API.

**Requirements:** the account must be an Instagram **Professional** account (Business, or an
eligible Creator account) linked to a Facebook Page. Personal accounts cannot be automated.

**Policy notes**

- Instaflow honours the **24-hour messaging window** — replies outside the window are only sent
  when the engagement itself (comment, follow) grants a fresh window.
- Sending rate limits are respected by the BullMQ worker (20 messages/sec, 5 concurrent jobs).
- Users are responsible for the content of their automated replies.

---

## Project structure

```
instaflow/
├── backend/
│   ├── src/
│   │   ├── config/        # env, logger, database, redis, swagger
│   │   ├── models/        # 20 Mongoose models
│   │   ├── controllers/   # request handlers
│   │   ├── routes/        # REST routers
│   │   ├── services/      # business logic (meta, messaging, automation, billing…)
│   │   ├── middleware/    # auth, validation, rate limit, CSRF, audit, sanitiser
│   │   ├── webhooks/      # Instagram webhook handling
│   │   ├── jobs/          # BullMQ queues + workers
│   │   ├── utils/         # crypto, jwt, errors, helpers
│   │   └── types/         # enums + Express augmentation
│   ├── tests/             # Jest + Supertest suites
│   ├── scripts/seed.ts
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/    # ui/ (shadcn-style), layout/
│   │   ├── pages/         # public/, dashboard/, admin/
│   │   ├── dashboard/     # dashboard widgets
│   │   ├── automation/    # React Flow node definitions
│   │   ├── services/      # typed API clients
│   │   ├── store/         # Zustand stores
│   │   ├── hooks/         # shared hooks
│   │   └── types/
│   ├── Dockerfile
│   └── nginx.conf
├── nginx/                 # edge reverse proxy + entrypoint
├── deploy/aws/            # CloudFormation, user-data, IAM policy
├── scripts/               # backup, deploy, restore helpers
├── docker-compose.yml
├── docker-compose.dev.yml
└── README.md
```

---

## API reference

Interactive documentation is served at **`/api/docs`** (Swagger UI) and `/api/docs.json`.

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create a user, workspace and free subscription |
| POST | `/api/auth/login` | Sign in, returns access + refresh tokens |
| POST | `/api/auth/logout` | Revoke the current session |
| POST | `/api/auth/refresh` | Rotate the refresh token, issue a new access token |
| POST | `/api/auth/forgot-password` | Send a reset link (never reveals account existence) |
| POST | `/api/auth/reset-password` | Set a new password and revoke all sessions |
| POST | `/api/auth/verify-email` | Consume an email-verification token |
| GET/PATCH | `/api/auth/me` | Read / update the current profile |
| POST | `/api/auth/change-password` | Change password (revokes sessions) |
| GET/DELETE | `/api/auth/sessions[/:id]` | List / revoke sessions |
| GET | `/api/auth/google`, `/api/auth/google/callback` | Google OAuth |

### Instagram

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/instagram/connect` | Returns the Meta OAuth dialog URL |
| GET | `/api/instagram/callback` | OAuth redirect target (called by Meta) |
| GET | `/api/instagram/accounts` | List connected accounts (tokens are never returned) |
| GET | `/api/instagram/accounts/:id` | Account detail |
| PATCH | `/api/instagram/accounts/:id` | Update response delay / pause settings |
| POST | `/api/instagram/accounts/:id/sync` | Refresh profile counters |
| DELETE | `/api/instagram/accounts/:id` | Disconnect and delete the token |

### Automations

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/automations` | List (filters: `type`, `isActive`, `instagramAccountId`, `search`) |
| POST | `/api/automations` | Create |
| GET | `/api/automations/:id` | Detail |
| PUT | `/api/automations/:id` | Update |
| PATCH | `/api/automations/:id/toggle` | Activate / deactivate |
| DELETE | `/api/automations/:id` | Delete |
| POST | `/api/automations/:id/duplicate` | Duplicate |
| GET | `/api/automations/:id/executions` | Execution history |
| POST | `/api/automations/:id/test` | Simulate a message against the rules |

### Leads · Conversations · Analytics · Billing · Link-in-bio · Admin

| Method | Endpoint | Description |
| --- | --- | --- |
| GET/POST | `/api/leads` | Search / create leads |
| GET/PATCH/DELETE | `/api/leads/:id` | Read / update / delete |
| GET | `/api/leads/export` | CSV export (Growth plan and above) |
| GET | `/api/leads/tags` | Distinct tags |
| GET | `/api/conversations` | DM inbox |
| GET | `/api/conversations/:id` | Full thread |
| POST | `/api/conversations/:id/reply` | Send a manual reply |
| GET | `/api/analytics/overview` | Dashboard metrics + usage snapshot |
| GET | `/api/analytics/dms` | DM performance, top keywords, trigger mix |
| GET | `/api/analytics/leads` | Lead sources and conversion |
| GET | `/api/analytics/usage` | Usage counters |
| POST | `/api/billing/create-order` | Create a Razorpay order (amount derived server-side) |
| POST | `/api/billing/verify-payment` | **Verify the payment on the server**, then activate |
| POST | `/api/billing/webhook` | Razorpay subscription/payment webhook |
| GET | `/api/billing/subscription` | Current plan + usage |
| GET | `/api/billing/history` | Billing history / invoices |
| POST | `/api/billing/cancel`, `/api/billing/downgrade` | Cancel / downgrade |
| GET/POST/PUT/DELETE | `/api/link-in-bio[/:id]` | Page CRUD |
| GET | `/api/link-in-bio/:id/analytics` | Views, clicks, per-link breakdown |
| GET | `/api/p/:slug` | Public page payload |
| POST | `/api/p/:slug/click/:linkId` | Public click tracking |
| GET | `/api/admin/overview` | MRR, users, subscriptions, events |
| GET/PATCH | `/api/admin/users[/:id]` | User management + suspension |
| GET | `/api/admin/subscriptions`, `/api/admin/payments` | Billing administration |
| GET | `/api/admin/usage`, `/api/admin/health` | Usage + system health |
| GET/POST | `/api/webhooks/instagram` | Meta verification + event delivery |

**Authentication:** send `Authorization: Bearer <accessToken>` on every protected route.

---

## Local development

### Run the API and SPA outside Docker

```bash
# Terminal 1 — API
cd backend
cp ../.env .env.local 2>/dev/null || true
npm install
npm run dev            # tsx watch, http://localhost:4000

# Terminal 2 — SPA
cd frontend
npm install
npm run dev            # vite, http://localhost:5173
```

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:4000`.

### Run the whole stack in Docker with hot reload

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:4000/api>
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`

### Useful scripts

```bash
npm run dev            # backend: watch mode
npm run build          # backend: compile to dist/
npm run start          # backend: run the compiled output
npm run typecheck      # backend: tsc --noEmit
npm run seed           # backend: seed demo data
npm run test           # backend: jest
npm run test:coverage  # backend: jest with coverage

npm run dev            # frontend: vite
npm run build          # frontend: production build
npm run typecheck      # frontend: tsc --noEmit
npm run test           # frontend: vitest
```

---

## Testing

```bash
cd backend  && npm test
cd frontend && npm run test
```

The backend suite boots an **in-memory MongoDB** (`mongodb-memory-server`), so no external
services are required. Covered areas:

| Suite | Coverage |
| --- | --- |
| `tests/auth.test.ts` | Registration, validation, duplicate emails, login, brute-force messaging, refresh rotation, protected routes, password reset, health |
| `tests/automation.test.ts` | Keyword matching (all five modes), templates, trigger→automation mapping, priority resolution, disabled rules |
| `tests/webhook.test.ts` | Meta verification handshake, messaging events, comment-to-DM, unknown accounts, webhook idempotency |
| `tests/billing.test.ts` | Plan catalogue, free-plan order rejection, **payment signature rejection**, webhook signature rejection, manual activation, billing history, tenant isolation |

Frontend tests use React Testing Library (`src/test/*.test.tsx`).

Docker health checks are defined for every service and are verified by `docker compose ps`.

### End-to-end smoke test

`scripts/smoke-test.sh` runs 28 assertions against a live stack — registration,
authentication, tenant isolation, webhooks, billing and analytics. Run it after
`docker compose up -d --build`:

```bash
./scripts/smoke-test.sh                 # defaults to http://localhost
./scripts/smoke-test.sh https://your-domain.com
```

`scripts/screenshot.js` captures the UI with Playwright for visual
regression checks (requires `npm i -D playwright && npx playwright install chromium`).

---

## Security

| Control | Implementation |
| --- | --- |
| Password storage | bcrypt with 12 salt rounds; plaintext is never stored |
| Token encryption | AES-256-GCM (`ENCRYPTION_KEY`); Meta tokens are `select: false` and never serialised |
| Authentication | Short-lived JWT access tokens + rotating refresh tokens stored hashed in MongoDB |
| Refresh-token reuse | Detected on rotation → every session for the user is revoked |
| Account lockout | 8 failed attempts → 15-minute lock |
| Rate limiting | Global, auth-specific (stricter) and webhook-specific limiters; plus Nginx zones |
| Input validation | Zod schemas on body, query and params — invalid input never reaches a service |
| NoSQL injection | `$` operators and dotted keys are rejected before any query runs |
| CSRF | Double-submit cookie for cookie-authenticated state-changing requests |
| Security headers | Helmet with a strict CSP in production, HSTS, `frame-ancestors 'none'` |
| CORS | Explicit allow-list, credentials enabled |
| Audit logging | Security-relevant actions written to a dedicated `AuditLog` collection |
| Tenant isolation | Every query scoped by the JWT-derived `workspaceId` |
| Webhooks | Meta verification token + Razorpay HMAC signature validation |
| Payment integrity | The frontend's success callback is **never trusted** — the signature is re-computed and the payment is re-fetched from Razorpay |

---

## Deployment on AWS

The recommended production topology:

```
Route 53 ──► CloudFront (optional) ──► ALB / Nginx on EC2
                                        ├── frontend container
                                        ├── backend container
                                        ├── MongoDB Atlas (M10+)
                                        ├── Redis (ElastiCache)
                                        └── S3 (assets, backups, invoices)
```

### 1. Provision

- **EC2** — Ubuntu 22.04, `t3.medium` or larger, Docker + Docker Compose installed
- **MongoDB Atlas** — M10 replica set, IP allow-list the EC2 private IP
- **ElastiCache Redis** — for BullMQ and caching
- **S3** — bucket for uploads and database backups
- **Route 53** — A record for the domain
- **ACM** — certificate for the load balancer or EC2 (or use certbot on the host)
- **CloudWatch** — log group for `/var/log/nginx` and Docker logs

### 2. Configure and deploy

```bash
# On the EC2 host
git clone <your-repo> instaflow && cd instaflow
cp .env.example .env && vi .env      # set production secrets
chmod +x scripts/*.sh
./scripts/deploy.sh                   # build, start, health-check
```

`scripts/deploy.sh` builds the images, starts the stack, waits for every container to report
`healthy` and prints the public URL.

### 3. TLS

```bash
sudo ./scripts/setup-https.sh your-domain.com admin@example.com
```

Uses certbot in webroot mode against the ACME challenge served by Nginx.

### 4. Backups

```bash
./scripts/backup.sh            # mongodump → S3 + local retention
./scripts/restore.sh <backup-directory>
```

A daily cron entry is installed by `deploy.sh`:

```
0 3 * * * /opt/instaflow/scripts/backup.sh >> /var/log/instaflow-backup.log 2>&1
```

### 5. CloudWatch

Install the CloudWatch agent on the host, then ship `/var/log/nginx/*.log` and the Docker JSON
logs. The backend also emits structured JSON logs via Pino in production, ready for the CloudWatch
agent's `log_stream_name` source.

### 6. Health monitoring

Point an uptime monitor at `https://your-domain.com/api/health`. The endpoint returns `503` when
MongoDB is unreachable, which will fail the monitor correctly.

---

## Plans & limits

| Plan | Instagram accounts | Active automations | Automation events / month | Extras |
| --- | --- | --- | --- | --- |
| **Free** | 1 | 2 | 500 | Basic analytics |
| **Starter** | 2 | 10 | 5,000 | Link-in-bio, basic lead management |
| **Growth** | 5 | 50 | 25,000 | Advanced analytics, lead export, workflow builder |
| **Business** | 10 | Unlimited* | 100,000 | Team members, advanced reporting, priority support |

\* Subject to fair use. Limits are enforced server-side in `usage.service.ts` — a workspace cannot
exceed its quota even by bypassing the UI.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `instaflow-backend` restarts | `docker compose logs backend` — usually a bad `MONGODB_URI` or a missing `ENCRYPTION_KEY` (must be 64 hex chars) |
| Nginx returns 502 for `/api` | The backend is not healthy yet — check `docker compose ps` |
| "Instagram integration is not configured" | Set `META_APP_ID` and `META_APP_SECRET`, then restart the backend |
| "Meta did not return an access token" | The redirect URI in the Meta app must match `META_REDIRECT_URI` exactly |
| Instagram DM never arrives | Check the webhook subscription in the Meta app, and that `META_WEBHOOK_VERIFY_TOKEN` matches |
| Webhook returns 403 | The verify token in the Meta app does not match `META_WEBHOOK_VERIFY_TOKEN` |
| Automations do not fire | Confirm the automation is **active**, the keyword rule is enabled, and the Instagram account is not paused |
| Payment succeeds but the plan does not change | The backend rejects unverifiable payments on purpose — check `RAZORPAY_KEY_SECRET` and the webhook secret |
| Queue jobs are stuck | Redis is unreachable: `docker compose logs redis` and check `REDIS_URL` |

---

## License

MIT. Not affiliated with Meta. Instagram™ is a trademark of Meta Platforms, Inc.
