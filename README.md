# Enterprise Boilerplate

Production-ready, batteries-included full-stack starter: **Vue 3 + Vite** SPA on the front, **Node.js/Express + Prisma** API on the back, wired into **MySQL**, **Redis**, **BullMQ**, **Meilisearch**, **Firebase** (FCM + Storage), Docker, Nginx, GitHub Actions CI, Prometheus/Grafana monitoring and a complete security layer.

> 🚀 Setting up for development? Read **[SETUP.md](SETUP.md)** — step-by-step instructions plus a full reference for every environment variable and where to obtain it (Resend/SendGrid/Mailgun/SES keys, Firebase service accounts, Meilisearch master key, secrets generation…).

---

## Feature highlights

| Area | What you get |
| --- | --- |
| Authentication | JWT access tokens + rotating refresh-token sessions, Argon2id password hashing, TOTP MFA (enable/disable flows), forgot/reset password emails |
| Authorization | RBAC with a database-backed permission catalog (`users:read`, `roles:manage`, ...), wildcard `*` superadmin, ownership checks, frontend directive + route guards |
| API | Express 4, Zod validation, uniform `{ success, data, meta }` envelope, Swagger/OpenAPI docs at `/api/docs`, Prometheus metrics at `/metrics` |
| Background jobs | BullMQ queues for email, image processing (Sharp → WebP variants), FCM push, Meilisearch indexing. Inline or standalone worker modes |
| Email | Multi-driver mail service: `log`, `smtp`, `resend`, `sendgrid`, `mailgun`, `ses` — switched by env var |
| Storage | Driver-based storage: local disk or Firebase/GCS bucket |
| Search | Meilisearch user index with automatic sync + SQL fallback |
| Frontend | Vue 3 `<script setup>`, Pinia stores, Vue Router guards, Tailwind CSS dark mode, Headless UI, Heroicons, Motion One animations, VeeValidate + yup forms, TanStack Table, ApexCharts, FilePond uploads |
| Ops | Docker Compose profiles (infra / full app), Nginx reverse proxy + SPA fallback, health/readiness endpoints, Sentry hooks, Grafana dashboards pre-provisioned |
| Quality | ESLint 9 flat config everywhere, Vitest + Supertest API suite (runs offline via in-memory fakes), Playwright e2e specs |

---

## Repository layout

```
.
├── client/                  # Vue 3 SPA
│   ├── src/api/             #   axios instance w/ auto token refresh + endpoint modules
│   ├── src/stores/          #   pinia: auth, ui (theme/sidebar), toast
│   ├── src/router/          #   routes + auth/permission guards
│   ├── src/components/      #   ui kit, layout shell, DataTable, charts, toasts
│   ├── src/views/           #   auth, dashboard, users, roles, profile/security, errors
│   ├── deploy/nginx.conf    #   SPA + API proxy nginx config baked into image
│   └── Dockerfile
├── server/                  # Express API
│   ├── prisma/              #   schema (MySQL) + idempotent seed
│   ├── src/config/          #   env validation (zod), logger (pino), constants
│   ├── src/lib/             #   prisma / redis / cache / firebase-admin / meilisearch clients
│   ├── src/middleware/      #   authenticate, authorize(RBAC), rate limit, validate, errors, metrics
│   ├── src/services/        #   mail(+6 drivers), storage(local|gcs), images(sharp), push(FCM), search, audit
│   ├── src/queues/          #   BullMQ queues + workers (email, image, push, search)
│   ├── src/modules/         #   auth(MFA), users, roles, uploads, notifications, search, stats, health
│   ├── src/docs/swagger.js  #   OpenAPI assembly
│   ├── tests/               #   vitest + supertest suite (offline-capable)
│   └── Dockerfile
├── e2e/                     # Playwright specs (run against docker compose stack)
├── monitoring/              # Prometheus scrape config, Grafana provisioning + dashboard
├── .github/workflows/ci.yml # lint + test + build + docker build gates
├── docker-compose.yml       # infra services always-on, --profile app for the full stack
└── playwright.config.js
```

---

## Quickstart

### Option A — full stack in Docker

```bash
cp .env.example .env            # then edit secrets (JWT_*, MYSQL_*, MEILI_MASTER_KEY...)
cp server/.env.example server/.env

docker compose --profile app up -d --build

# one-time: apply the committed baseline migration, then seed
docker compose --profile app run --rm migrate npx prisma migrate deploy
docker compose --profile app run --rm migrate npx prisma db seed
```

Open:

| URL | Service |
| --- | --- |
| http://localhost | SPA (nginx) |
| http://localhost/api/docs | Swagger UI |
| http://localhost:8025 | Mailpit inbox (dev email) |
| http://localhost:3001 | Grafana (admin / `${GRAFANA_ADMIN_PASSWORD}`) |
| http://localhost:9090 | Prometheus |

Default seeded admin: `admin@example.com` / `Admin123!` (override via `ADMIN_EMAIL` / `ADMIN_PASSWORD` before seeding). **Change it immediately in any real environment.**

### Option B — manual development (hot reload)

```bash
# 1. infrastructure only
cp .env.example .env
docker compose up -d mysql redis meili mailpit prometheus grafana redis-exporter

# 2. API
cd server
cp .env.example .env                 # host-oriented values already set
npm install
npx prisma migrate dev --name init   # creates schema
npx prisma db seed                   # roles, permissions, admin user
npm run dev                          # http://localhost:5000 (inline workers enabled)

# 3. Client
cd ../client
npm install
npm run dev                          # http://localhost:5173 (proxies /api -> :5000)
```

Sign in with the seeded admin, explore Users/Roles (admin), Profile & Security → enable 2FA from any account.

---

## Scripts

### Server (`server/`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start API with watch mode + inline queue workers |
| `npm start` | Production start (workers off unless inline mode) |
| `npm run worker` | Standalone BullMQ worker process |
| `npm test` / `test:watch` | Vitest + Supertest suite (no external services required) |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run db:migrate` / `db:deploy` | Prisma migrate dev / deploy |
| `npm run db:seed` / `db:studio` | Seed / Prisma Studio |

### Client (`client/`)

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server with `/api` proxy |
| `npm run build` / `preview` | Production build / serve dist |
| `npm test` | Vitest store/unit tests |
| `npm run lint` / `lint:fix` | ESLint (vue flat config) |

### Root

| Command | Description |
| --- | --- |
| `npm run e2e` | Playwright against a running stack (`E2E_BASE_URL`) |

---

## Key environment variables (server)

See [`server/.env.example`](server/.env.example) for the annotated list. The critical ones:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | MySQL connection string (Prisma) |
| `REDIS_URL` | Used by cache, rate limiting and BullMQ |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `MFA_TOKEN_SECRET` | Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `WORKER_MODE` | `inline` (dev), `standalone` (compose/production), `off` (tests) |
| `MAIL_DRIVER` | `log` \| `smtp` \| `resend` \| `sendgrid` \| `mailgun` \| `ses` |
| `STORAGE_DRIVER` | `local` (disk + static route) or `gcs` (Firebase Storage bucket) |
| `FCM_ENABLED` + `FIREBASE_*` | Push notifications; requests fail with a clear 503 until configured |
| `MEILI_ENABLED` | Search index sync; SQL LIKE fallback when false |
| `SENTRY_DSN` | Enables Sentry request/error capture when present |
| `PROD_CSP` | Opt-in Helmet CSP in production (see Security notes) |

---

## API surface (`/api/v1`)

```
POST   /auth/register | /auth/login | /auth/mfa/verify | /auth/refresh
POST   /auth/logout | /auth/logout-all | /auth/forgot-password | /auth/reset-password
PATCH  /auth/password
POST   /auth/mfa/setup | /auth/mfa/confirm | /auth/mfa/disable
GET    /auth/me

GET    /users            (users:read)     POST /users        (users:create)
GET/PATCH /users/me      GET/PATCH/DELETE /users/:id         (users:update/delete)
GET    /roles            (roles:read)     POST/PATCH/DELETE  (roles:manage)
GET    /roles/permissions
POST   /uploads/avatar   GET /uploads/me  DELETE /uploads/:id
POST   /notifications/devices | GET /notifications/me | PATCH /notifications/:id/read
POST   /notifications/send (notifications:send)
GET    /search/users
GET    /stats/overview   (stats:read)
```

Interactive docs with schemas live at **`/api/docs`**.

---

## Security model

- **Passwords**: Argon2id (19 MiB memory cost) with automatic rehash detection.
- **Sessions**: opaque refresh tokens stored as SHA-256 hashes; rotation on every refresh; revocation on logout/reset; `logout-all` nukes every session.
- **RBAC**: permissions resolved per-request from DB (60s Redis cache, invalidated on role/user mutations); middleware `authorize('perm')` + wildcard role support; system roles locked from edits/deletion.
- **Rate limiting**: Redis-backed sliding window globally + stricter limiter on auth endpoints; fails open if Redis is down (`passOnStoreError`).
- **Input validation**: Zod schemas on body/query/params → `422` with field-level details; Prisma parameterizes all SQL (injection-safe by construction).
- **Headers/XSS**: Helmet defaults; strict CSP is opt-in via `PROD_CSP=true` because Swagger UI needs inline scripts — enable it behind nginx once docs are restricted. React to XSS primarily through output escaping in the SPA (Vue templates escape by default).
- **CSRF**: Not applicable to the default stateless `Authorization: Bearer` design (no cookies). If you move sessions to cookies, add CSRF middleware before shipping.
- **Uploads**: mimetype allowlist, size caps (5MB avatar / 25MB generic), Sharp re-encodes images (strips EXIF/payloads).
- **Audit trail**: `audit_logs` records logins, failures, password/MFA changes and admin mutations.

---

## Testing strategy

- **Server unit/integration**: Vitest + Supertest against the real Express app with an in-memory Prisma fake and stubbed Redis/Meilisearch — covers register/login/refresh rotation/MFA, RBAC grants/denials, pagination/filtering and error envelopes. Runs anywhere, no DB needed.
- **Client**: Vitest store tests (permissions matrix, toast lifecycle).
- **E2E**: Playwright chromium spec exercising guard redirects, register → dashboard → logout → login and failed-login errors. Requires the compose stack: `docker compose --profile app up -d --build` then `npm run e2e`.
- **CI**: GitHub Actions runs server lint+validate+tests (with MySQL/Redis service containers), client lint+test+build, and builds both Docker images on pushes.

---

## Production deployment notes

1. Provision managed MySQL + Redis (or keep containers with tuned volumes/backups). **BullMQ requires the Redis eviction policy `noeviction`** (`maxmemory-policy noeviction`) or queued jobs may vanish under memory pressure.
2. Set strong secrets in `.env` (JWT secrets ≥ 32 chars, unique `MEILI_MASTER_KEY`).
3. Choose real drivers: `MAIL_DRIVER=resend|ses|...`, `STORAGE_DRIVER=gcs` with `FIREBASE_*` credentials, `FCM_ENABLED=true` + service account JSON for push.
4. `docker compose --profile app up -d --build` behind your load balancer; terminate TLS at the LB or extend `client/deploy/nginx.conf` with certbot/443 block.
5. Scale workers independently: `docker compose up -d --scale worker=4`.
6. Point Sentry DSN at the project; Grafana dashboards provision automatically.
7. Restrict `/api/docs` (e.g., basic-auth in nginx or remove in hardened deployments) and flip `PROD_CSP=true`.

---

## Extending the boilerplate

New resource checklist (server): `src/modules/<name>/` with `*.validation.js` (zod), `*.service.js`, `*.controller.js`, `*.routes.js` (+ OpenAPI JSDoc), mount in `src/routes/index.js`, add permission keys to `config/constants.js` **and** `prisma/seed.js`, reseed.

Frontend: add an endpoint module under `src/api`, views under `src/views`, register the route with `meta.permission` — sidebar entry appears automatically when the signed-in user holds that permission.

MIT licensed. Happy shipping.
