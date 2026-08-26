# Setup Guide (Development)

A complete walkthrough for getting the boilerplate running locally — every environment variable explained, including **where exactly to obtain each one**.

> Looking for the high-level overview? See [README.md](README.md).

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Environment files overview](#2-environment-files-overview)
3. [Path A — Full stack in Docker](#3-path-a--full-stack-in-docker)
4. [Path B — Manual development (hot reload)](#4-path-b--manual-development-hot-reload)
5. [Database migration & seeding](#5-database-migration--seeding)
6. [Server environment variables — full reference](#6-server-environment-variables--full-reference)
   - [Core](#61-core-app-settings)
   - [MySQL](#62-mysql-database_url)
   - [Redis](#63-redis)
   - [Auth secrets](#64-jwt--mfa-secrets)
   - [Meilisearch](#65-meilisearch-search)
   - [Email drivers](#66-email-mail_driver--per-driver-keys)
   - [Storage (Firebase / GCS)](#67-storage-storage_drivergcs--firebase)
   - [Push notifications (FCM)](#68-push-notifications-fcm_enabledtrue)
   - [Sentry](#69-sentry-error-tracking)
   - [Rate limiting & security](#610-rate-limiting--security-toggles)
7. [Client environment variables](#7-client-environment-variables-vite)
8. [Root `.env` (docker-compose) variables](#8-root-env-docker-compose)
9. [Verify your setup](#9-verify-your-setup)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Why | Install |
| --- | --- | --- | --- |
| Node.js | ≥ 20 LTS | API runtime, Vite, Prisma CLI | <https://nodejs.org> (`node -v` to check) |
| npm | ≥ 10 | Bundled with Node | — |
| Docker Desktop | recent stable | Runs MySQL, Redis, Meilisearch, Mailpit, Prometheus, Grafana | <https://www.docker.com/products/docker-desktop/> |
| Git | any | Clone repo | — |

Optional but useful:

| Tool | Purpose |
| --- | --- |
| MySQL client / tableplus / DBeaver | Inspect data outside Prisma Studio |
| `wsl --status` awareness (Windows only) | Windows often has `wslrelay.exe` squatting on port **5000** — see [Troubleshooting](#10-troubleshooting) |
| Firebase account | Only needed for push notifications and/or GCS storage |
| Provider accounts | Only needed for real email/SMS/error tracking |

---

## 2. Environment files overview

There are **three** env files. Each has an example committed to git; the real files are gitignored.

| File | Used by | When |
| --- | --- | --- |
| `.env` (repo root) | `docker-compose.yml` substitutions (`${VAR}` placeholders) | Running anything through Docker Compose |
| `server/.env` | The Express API (host-run *and* containerized) | Always |
| `client/.env` | Vite (variables must be prefixed `VITE_`) | Only for non-default API origin / proxy target |

```bash
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env    # optional — works out of the box without it
```

**How container networking resolves:** `server/.env` contains host-friendly values (`localhost`). When services run inside Docker Compose, the `environment:` blocks in `docker-compose.yml` override those values with network hostnames (`mysql`, `redis`, `meili`, `mailpit`). You never maintain two copies.

Generate strong secrets once and reuse them across files:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 3. Path A — Full stack in Docker

Everything (API, workers, SPA, nginx, databases) runs in containers.

```bash
cp .env.example .env
cp server/.env.example server/.env

docker compose --profile app up -d --build

# one-time: apply the committed baseline migration, then seed
docker compose --profile app run --rm migrate npx prisma migrate deploy
docker compose --profile app run --rm migrate npx prisma db seed
```

> The initial migration (`server/prisma/migrations/000000000000_init/`) is committed to the repo, so `migrate deploy` works everywhere without needing `migrate dev`. Use `exec api …` instead of `run --rm migrate …` only if the api container is already healthy and you prefer reusing it.

**Generating future migrations:** schema changes are made on your machine (not in Docker) so Prisma can use a shadow database:

```bash
cd server
# point DATABASE_URL at the dockerized MySQL from the host:
DATABASE_URL="mysql://root:<MYSQL_ROOT_PASSWORD>@localhost:3306/app" npx prisma migrate dev --name add_feature
```

Commit the generated folder under `prisma/migrations/` — CI/CD applies it via `migrate deploy`.

| URL | What |
| --- | --- |
| <http://localhost> | Web app (nginx serving built SPA + proxying `/api`) |
| <http://localhost/api/docs> | Swagger UI |
| <http://localhost:8025> | Mailpit inbox (emails sent by the app land here) |
| <http://localhost:3001> | Grafana dashboards (`admin` / value of `GRAFANA_ADMIN_PASSWORD`) |
| <http://localhost:9090> | Prometheus targets |

Sign in: seeded admin from root `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`, default `admin@example.com` / `Admin123!`).

---

## 4. Path B — Manual development (hot reload)

Recommended for day-to-day development — API restarts on save, Vite serves instant HMR.

### 4.1 Start infrastructure

```bash
cp .env.example .env          # provides MYSQL_* passwords used by the mysql container
docker compose up -d mysql redis meili mailpit prometheus grafana redis-exporter
```

This gives you:

| Service | Endpoint | Notes |
| --- | --- | --- |
| MySQL 8 | `localhost:3306` | root password from root `.env` (`MYSQL_ROOT_PASSWORD`) |
| Redis 7 | `localhost:6379` | cache + rate limiting + BullMQ |
| Meilisearch | `localhost:7700` | master key = `MEILI_MASTER_KEY` from root `.env` |
| Mailpit | `localhost:8025` (UI), `localhost:1025` (SMTP) | catches all dev email |
| Monitoring | `:9090` / `:3001` | scrapes your locally-running API |

### 4.2 Configure and start the API

```bash
cd server
cp .env.example .env
```

Open `server/.env` and confirm these defaults match your root `.env` passwords:

```ini
DATABASE_URL=mysql://root:<MYSQL_ROOT_PASSWORD>@localhost:3306/app
REDIS_URL=redis://localhost:6379
MEILI_HOST=http://localhost:7700
MEILI_API_KEY=<same value as MEILI_MASTER_KEY>
SMTP_HOST=localhost        # Mailpit
SMTP_PORT=1025
MAIL_DRIVER=log            # switch to smtp to see emails in Mailpit
WORKER_MODE=inline         # queues run inside the dev server process
STORAGE_DRIVER=local       # uploads saved to ./storage
FCM_ENABLED=false
```

Then:

```bash
npm install
npx prisma migrate dev --name init     # creates all tables
npx prisma db seed                     # roles, permissions, admin user
npm run dev                            # http://localhost:5000
```

### 4.3 Start the web client

```bash
cd ../client
npm install
npm run dev                            # http://localhost:5173
```

Vite proxies `/api/*` and `/uploads/*` to `http://localhost:5000` automatically (`VITE_PROXY_TARGET`).

### 4.4 First login

1. Open <http://localhost:5173>
2. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults `admin@example.com` / `Admin123!`)
3. Explore **Users**, **Roles & Permissions**, and enable 2FA under **Profile & Security**

---

## 5. Database migration & seeding

| Command | Use when |
| --- | --- |
| `npx prisma migrate dev --name <name>` | Creating/changing schema during development (generates SQL in `prisma/migrations/`) |
| `npx prisma migrate deploy` | Applying committed migrations in CI/staging/prod (no prompt) |
| `npx prisma db seed` | Idempotent — safe to re-run; upserts permissions/roles, creates admin only if missing |
| `npx prisma studio` | Browser GUI over the database |

Seeded content:

- **Permissions**: `users:*`, `roles:*`, `uploads:create|delete`, `notifications:read|send`, `stats:read`, plus wildcard `*`
- **Roles**: `admin` (`*`, system), `manager`, `user`
- **Admin user**: from `ADMIN_EMAIL` / `ADMIN_PASSWORD`

---

## 6. Server environment variables — full reference

Every variable is read once at boot by [`server/src/config/env.js`](server/src/config/env.js) (Zod-validated). Missing required values fail fast with a clear message.

### 6.1 Core app settings

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production`. Controls logging format, worker behavior, CSP |
| `PORT` | no | `5000` | HTTP port. **Change it if port 5000 is taken** (WSL relay on Windows) |
| `APP_URL` | no | `http://localhost:5173` | Public web origin — used in email links/buttons |
| `API_URL` | no | `http://localhost:5000` | Public API origin — used to build local storage upload URLs |
| `CLIENT_URL` | yes* | `http://localhost:5173` | Base of reset-password links: `${CLIENT_URL}/reset-password?token=…` |
| `CORS_ORIGIN` | no | `http://localhost:5173` | Comma-separated allowlist, e.g. `https://app.acme.com,https://admin.acme.com` |

\* Has a default, but should always be set to your real frontend origin outside local dev.

### 6.2 MySQL (`DATABASE_URL`)

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | Standard Prisma MySQL connection string |

Format:

```
mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

Where do the parts come from?

- **Local dev (compose)**: user `root`, password = `MYSQL_ROOT_PASSWORD` you set in root `.env`, host `localhost`, port `3306`, database name is created automatically as `MYSQL_DATABASE` (default `app`).
  ```ini
  DATABASE_URL=mysql://root:myRootPass@localhost:3306/app
  ```
- **Managed (PlanetScale-style URLs won't work directly — needs a standard MySQL):** use your provider's connection string (Railway, RDS, Cloud SQL, Azure Database for MySQL). For Cloud SQL via the Auth Proxy the host is `127.0.0.1`.
- Special characters in the password must be URL-encoded (`@` → `%40`, `#` → `%23`).

### 6.3 Redis

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `REDIS_URL` | no | `redis://localhost:6379` | Used for caching, rate limiting, and BullMQ |

Sources: compose container (default), or managed instances — Upstash (`rediss://…` TLS prefix supported by ioredis), Redis Cloud, ElastiCache. If you bring your own Redis, set `maxmemory-policy noeviction` (BullMQ requirement).

### 6.4 JWT & MFA secrets

| Variable | Required | Constraint | Purpose |
| --- | --- | --- | --- |
| `JWT_ACCESS_SECRET` | **yes** | min 32 chars | Signs 15-min access tokens |
| `JWT_REFRESH_SECRET` | **yes** | min 32 chars | Reserved for refresh-token context |
| `MFA_TOKEN_SECRET` | **yes** | min 32 chars | Signs the short-lived "mfa challenge" token between login steps |
| `JWT_ACCESS_TTL` | no | seconds (default `900`) | Access token lifetime |
| `JWT_REFRESH_TTL` | no | seconds (default `604800` = 7 days) | Refresh session lifetime |

**How to generate** (run three times):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# or on Linux/macOS
openssl rand -hex 48
```

Treat these like passwords — never commit real ones. In production, load them from your secret manager (AWS Secrets Manager, Doppler, Vault, GitHub Actions secrets…).

### 6.5 Meilisearch (search)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MEILI_ENABLED` | no | `true` | `false` disables indexing and falls back to SQL LIKE search |
| `MEILI_HOST` | no | `http://localhost:7700` | Meilisearch HTTP endpoint |
| `MEILI_API_KEY` | yes* | — | Must equal the instance master key (or a key with `documents.add`/`search` scopes) |

Where to get it:

- **Compose instance**: it's the `MEILI_MASTER_KEY` you invented in root `.env` (min 16 chars). Copy the same value into `server/.env`'s `MEILI_API_KEY`.
- **Meilisearch Cloud**: dashboard → your project → **API Keys**.
- Self-hosted binary: whatever you passed as `--master-key`.

### 6.6 Email (`MAIL_DRIVER` + per-driver keys)

Pick one driver. Everything else can stay blank.

#### `MAIL_DRIVER=log` (default, zero config)
Emails are printed to the API logs. Great for first boot.

#### `MAIL_DRIVER=smtp` (recommended for local dev → Mailpit)
```ini
MAIL_FROM="Acme Dev <dev@acme.test>"
SMTP_HOST=localhost      # 'mailpit' when running inside compose
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=               # empty for Mailpit
SMTP_PASS=
```
For production SMTP (Postmark transactional, Gmail app-password, SES SMTP interface…) fill host/port/credentials from that provider's dashboard.

#### `MAIL_DRIVER=resend`
1. Sign up at <https://resend.com>
2. Dashboard → **API Keys** → *Create API Key* → copy (`re_…`)
3. Verify your sending domain (**Domains**) or test with their sandbox sender
```ini
RESEND_API_KEY=re_xxxxxxxxxxxx
MAIL_FROM="Acme <no-reply@yourverifieddomain.com>"
```

#### `MAIL_DRIVER=sendgrid`
1. <https://app.sendgrid.com> → **Settings → API Keys → Create API Key** (Full Access or Mail Send) → copy (`SG.…`)
2. Verify a single sender (**Sender Authentication**) or authenticate your domain
```ini
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
MAIL_FROM="Acme <no-reply@yourdomain.com>"   # must be a verified sender/domain
```

#### `MAIL_DRIVER=mailgun`
1. <https://signup.mailgun.com> → add & verify your domain (**Sending → Domains**)
2. **Settings → API Keys → Private API key** (`key-…` or newer hex key)
3. If your domain is in the EU region also set the EU base URL
```ini
MAILGUN_API_KEY=xxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_BASE_URL=https://api.mailgun.net    # EU: https://api.eu.mailgun.net
```

#### `MAIL_DRIVER=ses`
1. AWS Console → **Amazon SES** → choose region (note it, e.g. `us-east-1`)
2. Verify the sending identity: **Configuration → Identities → Create identity** (domain or single address)
3. Move out of the SES sandbox if emailing arbitrary addresses (Request production access)
4. Create an IAM user with programmatic access limited to `sesv2:SendEmail` → copy the key pair
```ini
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

All drivers share:

| Variable | Example | Notes |
| --- | --- | --- |
| `MAIL_FROM` | `"Acme <no-reply@acme.com>"` | Must be allowed by the chosen provider |

### 6.7 Storage (`STORAGE_DRIVER=gcs` + Firebase)

#### `STORAGE_DRIVER=local` (default, zero config)

Files are written to `STORAGE_LOCAL_PATH` (default `./storage`) and served back at `/uploads/<key>` by Express static. Nothing else to configure.

#### `STORAGE_DRIVER=gcs` (Firebase Storage or plain Google Cloud Storage)

Both use Google Cloud Storage buckets — Firebase Storage *is* a GCS bucket.

1. Create a project at <https://console.firebase.google.com> (or use GCP console)
2. Unlock Storage: **Build → Storage → Get started** → note the bucket name shown, e.g. `my-project.appspot.com` (visible again in **Storage → Files**, or `gs://…` header)
3. Generate a service account key:
   - Firebase console → ⚙️ **Project settings → Service accounts**
   - Click **Generate new private key** → downloads a JSON file
   - From that JSON you need: `project_id`, `client_email`, `private_key`
4. Fill the env:
```ini
STORAGE_DRIVER=gcs
FIREBASE_STORAGE_BUCKET=my-project.appspot.com
FIREBASE_PROJECT_ID=my-project                # JSON: project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@my-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```
   Keep `\n` escaped exactly as in the JSON — the loader converts them.
   
   Alternative: skip the inline trio and point `GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json`; the SDK picks it up automatically.

> Uploads become public objects via `makePublic()`. If your bucket enforces Uniform Bucket-Level Access, serve via signed URLs instead (swap in `file.getSignedUrl()` in [`drivers/gcs.js`](server/src/services/storage/drivers/gcs.js)).

### 6.8 Push notifications (`FCM_ENABLED=true`)

Uses the same Firebase service-account credential flow as storage above (Firebase Admin SDK — there is no separate "server key" anymore; legacy server keys were retired).

1. Same JSON from **Project settings → Service accounts → Generate new private key**
2. Enable messaging: Firebase console → **Engage → Messaging** (first visit prompts you to enable the Cloud Messaging API)
```ini
FCM_ENABLED=true
FIREBASE_PROJECT_ID=my-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@my-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Device registration happens client-side via `POST /api/v1/notifications/devices` with an FCM web-push token. Until configured, push endpoints respond with a clean `503 SERVICE_DISABLED`.

### 6.9 Sentry (error tracking)

1. Create org/project at <https://sentry.io> (platform: **Node.js**)
2. Copy the DSN from **Project Settings → Client Keys (DSN)**
```ini
SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=development      # label events: staging / production
```
When absent, Sentry stays completely disabled (zero overhead).

### 6.10 Rate limiting & security toggles

| Variable | Default | Description |
| --- | --- | --- |
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 min) | Sliding window length (Redis-backed) |
| `RATE_LIMIT_MAX` | `300` | Max requests per window per IP globally |
| `AUTH_RATE_LIMIT_MAX` | `10` | Max auth attempts per window on login/register/forgot endpoints |
| `PROD_CSP` | `false` | Enables strict Helmet CSP in production. Off by default because Swagger UI needs inline scripts — flip on once `/api/docs` is restricted behind nginx |
| `WORKER_MODE` | `inline` | `inline`: workers share the API process (dev). `standalone`: run separately via `npm run worker` (prod/compose). `off`: disable entirely (tests) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@example.com` / `Admin123!` | Seed-only bootstrap credentials |

---

## 7. Client environment variables (Vite)

Only two, both optional. All client env vars must be prefixed `VITE_` and are **baked in at build time** (never put secrets here).

| Variable | Default | When to set |
| --- | --- | --- |
| `VITE_API_BASE_URL` | *(empty)* | Set only when the API lives on a different origin than the SPA, e.g. `https://api.acme.com`. Leave empty when nginx/Vite proxy handles routing (the default everywhere in this boilerplate) |
| `VITE_PROXY_TARGET` | `http://localhost:5000` | Dev-server proxy target. Change if your API runs elsewhere, e.g. `:5577` after the port-5000 conflict workaround |

After changing either, restart `npm run dev` (Vite reads env only at startup).

---

## 8. Root `.env` (docker-compose)

These values are substituted into `docker-compose.yml` (`${VAR}` syntax) and into the containers' environments:

| Group | Variables | Notes |
| --- | --- | --- |
| MySQL | `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `DATABASE_URL` | `DATABASE_URL` here points at host `mysql` (container DNS), not localhost |
| Redis | `REDIS_URL` | Points at `redis://redis:6379` |
| Meilisearch | `MEILI_ENABLED`, `MEILI_HOST`, `MEILI_MASTER_KEY`, `MEILI_API_KEY` | Both keys hold the same value |
| URLs | `APP_URL`, `API_URL`, `CLIENT_URL`, `CORS_ORIGIN`, `PORT` | Container-facing values |
| Secrets | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MFA_TOKEN_SECRET`, TTLs | Same values as `server/.env` |
| Workers | `WORKER_MODE` | Set to `standalone` for the composed stack |
| Email | `MAIL_DRIVER` + driver keys, `SMTP_HOST=mailpit` | Mailpit captures everything in dev |
| Storage/Push | `STORAGE_DRIVER`, `FIREBASE_*`, `GOOGLE_APPLICATION_CREDENTIALS`, `FCM_ENABLED` | Mount the SA JSON via a volume if using the file-path variant |
| Monitoring | `SENTRY_DSN`, `GRAFANA_ADMIN_PASSWORD`, `APP_PORT` | `APP_PORT` maps nginx's published port (default 80) |
| Security | `PROD_CSP`, rate-limit trio | |
| Bootstrap | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Consumed by the seed job |

Minimal viable root `.env` for local Docker dev is already valid as shipped in `.env.example` — just replace every `change-me…` string.

---

## 9. Verify your setup

Run down this list after booting:

| Check | Expected |
| --- | --- |
| `curl http://localhost:5000/healthz` | `{"status":"ok", ...}` |
| `curl http://localhost:5000/readyz` | `checks.database:true, checks.redis:true` |
| Open `http://localhost:5000/api/docs` | Swagger UI renders, "Authorize" button works with a real token |
| `curl http://localhost:5000/metrics` | Prometheus text output (`http_request_duration_seconds…`) |
| Register via UI at `/register` | 201, auto-login lands on dashboard |
| Mailpit at `:8025` (with `MAIL_DRIVER=smtp`) | Welcome email arrived |
| Grafana `:3001` → *API Overview* dashboard | Charts populate within ~30s of traffic |
| Users page as admin | Table loads; Roles page shows permission chips |
| Profile & Security → Enable 2FA | Secret + otpauth URI shown; code confirms |

Automated suites (no external services required):

```bash
cd server && npm test        # 28 tests: auth/MFA, RBAC, users, health
cd client && npm test        # store unit tests
npm run e2e                  # from repo root, against a running compose stack
```

---

## 10. Troubleshooting

| Symptom | Cause → Fix |
| --- | --- |
| Boot log: `Invalid environment configuration … JWT_ACCESS_SECRET` | Missing/short (<32 char) secret → regenerate with the `randomBytes` one-liner |
| Requests to `:5000` return unexpected 404s on Windows | `wslrelay.exe` owns port 5000 → set `PORT=5577` in `server/.env` **and** `VITE_PROXY_TARGET=http://localhost:5577` in `client/.env` |
| `EADDRINUSE :::5000` | Same as above, or another app on the port |
| `Error code: P1012 - Environment variable not found: DATABASE_URL` during Prisma CLI commands | No `server/.env` yet → `cp server/.env.example server/.env` |
| `No migration found in prisma/migrations` then seed fails with `P2021: The table X does not exist` | Schema never applied → run `npx prisma migrate deploy` **before** seeding. If you just changed the schema locally, create a migration first with `prisma migrate dev --name <name>` and commit it |
| `P1001: Can't reach database server` | MySQL container not running → `docker compose up -d mysql`; verify host/port/password in `DATABASE_URL` |
| API boots but every DB query hangs/fails | Ran API before `migrate dev` → run migrations |
| Redis warnings: *"Eviction policy is allkeys-lru. It should be noeviction"* | Your local/managed Redis evicts keys — BullMQ jobs could disappear → `redis-cli CONFIG SET maxmemory-policy noeviction` (persist it in managed console too) |
| Browser: *"Cannot reach the server"* / CORS error | Origin not allowlisted → add your exact origin (with port) to `CORS_ORIGIN` |
| Infinite 401 refresh loop | Refresh token expired/rotated while multiple tabs open → sign out (`logout-all` clears); check system clock skew |
| Emails never appear anywhere | `MAIL_DRIVER=log` writes to API stdout, not Mailpit → set `MAIL_DRIVER=smtp` + `SMTP_HOST=localhost` `SMTP_PORT=1025` for Mailpit |
| `503 SERVICE_DISABLED: FCM is not configured` | Expected until `FCM_ENABLED=true` + `FIREBASE_*` trio provided |
| `503 … GCS storage not configured` | `STORAGE_DRIVER=gcs` without bucket/credentials → complete §6.7 or revert to `local` |
| Meilisearch 401/missing index | `MEILI_API_KEY` ≠ master key → copy the same value; indexes are created lazily on first sync/search |
| Swagger UI blank in production | CSP enabled (`PROD_CSP=true`) blocks inline scripts → restrict/remove `/api/docs` at nginx, keep CSP on |
| Seed says "Admin already exists" | It's idempotent — expected on re-runs |
| Playwright e2e fails immediately | Stack not running → `docker compose --profile app up -d --build` first, then retry |

Still stuck? Check API logs first (`server` stdout is structured Pino JSON with `requestId` — grep it against the `requestId` returned in error responses).
