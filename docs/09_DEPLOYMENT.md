# 09 — Deployment and Operations

## 1. Environments

Recommended:

- Local development
- Optional staging
- Production

V1 may deploy directly to production after local verification if the owner accepts the risk, but deployment scripts should still separate environment configuration.

---

## 2. Local development

Recommended dependencies:

- Node.js current project-supported LTS/current stable policy
- pnpm
- Docker Desktop/Engine
- PostgreSQL through Docker Compose

Local services:

- Web
- API
- PostgreSQL
- Android mobile app built/run from the Gradle project on an emulator or device

---

## 3. Docker strategy

Use Docker for:

- PostgreSQL locally
- API production image
- Web production image where deployment target supports it

Mobile is built as an Android APK through the Gradle wrapper. It is not a long-running
server container and does not require Node.js or pnpm.

---

## 4. Production topology

Simple recommended topology:

```text
Internet
   │
 HTTPS
   ▼
Reverse Proxy / Platform Edge
   ├── Web
   └── API
          │
          ▼
      PostgreSQL
```

PostgreSQL should not be directly public unless platform architecture requires controlled exposure.

The checked-in one-command update workflow is `bash docker/production-update.sh`.
It requires a VPS `.env.production` file containing the GHCR image owner/tag,
database URL/credentials, auth secrets, CORS origin, and optional host ports.
The script validates Compose, pulls API/Web images, starts PostgreSQL, runs
`prisma migrate deploy` in the pulled API image, recreates only API/Web, checks
both HTTP health endpoints, and prunes dangling images only. It never runs
`down -v`, removes named volumes, or performs an automatic destructive rollback.
The default image tag remains `latest`; set `IMAGE_TAG` for a deliberate rollback
to a previously published immutable SHA tag.

The script's actual order is: validate Compose and the production env file, pull
API/Web images, start and inspect healthy PostgreSQL, run
`prisma migrate deploy` in the pulled API image, force-recreate only API/Web,
poll `/health/ready` and `/`, print service status, then prune dangling images.
On any failure it stops with inspection guidance and does not attempt a
destructive rollback. Named database volumes are never removed.

Current production remains an IP-only HTTP deployment on ports 3000/4000, with
no checked-in TLS reverse-proxy configuration. The owner has run the guarded
update with the published Phase 2 image; the 2026-08-27 read-only recheck found
HTTP 200 for `/health`, `/health/ready`, and the Web root. HTTPS remains an
explicit accepted-risk exception until the owner supplies a domain/certificate;
see docs/security/production-transport-audit.md.

---

## 5. Environment variables

Minimum API configuration:

```text
NODE_ENV
PORT
DATABASE_URL
AUTH_USERNAME
AUTH_PASSWORD_HASH
AUTH_TOKEN_SECRET or session secret
CORS_ORIGINS
UPLOAD_MAX_BYTES
LOG_LEVEL
```

Web:

```text
NEXT_PUBLIC_API_BASE_URL
```

Mobile:

```text
BuildConfig.API_BASE_URL
```

Never expose backend secrets through public-prefixed client variables.

`NEXT_PUBLIC_API_BASE_URL` is embedded into the Next.js browser bundle during
`next build`. The Web production image therefore requires this value as a
Docker build argument; changing only the running container environment cannot
change the already-built browser bundle.

The Android API value is embedded into the native binary at Gradle build time. The
debug variant defaults to `http://localhost:4000/api/v1` for local development, while
the installable `production` variant and the release variant default to
`http://157.173.127.217:4000/api/v1`. The `-PapiBaseUrl=...` property overrides
either variant without changing source code. Android cleartext traffic is enabled
for the current HTTP development/production IP and must be replaced with HTTPS when
the deployment endpoint supports it.

Local values:

```text
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

Production values for the current host:

```text
CORS_ORIGINS=http://157.173.127.217:3000
NEXT_PUBLIC_API_BASE_URL=http://157.173.127.217:4000/api/v1
```

The Android production/release builds use the same production API URL by default.
Production API CORS must allow `http://157.173.127.217:3000` for the Web client;
Android native requests do not send a browser Origin header.

The GHCR publish workflow passes the production Web value to the Docker build.
When `CORS_ORIGINS` is omitted, the API defaults to localhost outside
production and to `http://157.173.127.217:3000` in production.

---

## 6. `.env.example`

Repository shall include safe placeholders, for example:

```text
DATABASE_URL=postgresql://user:password@localhost:5432/japanese_learning
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=<generated-hash>
AUTH_TOKEN_SECRET=<replace-me>
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

No real production values.

---

## 7. Database migrations

Deployment order:

1. Backup if migration is risky/destructive.
2. Apply Prisma migrations.
3. Start/roll application.
4. Run health/smoke checks.

If migration cannot be backward compatible, document maintenance expectations.

Phase 3 extends this sequence to ten checked-in Prisma migrations. The final
dictionary-history, dictionary-favorites, and exam-mistake-retention migrations
must be applied through `prisma migrate deploy`; run
`scripts/verify-phase2-migrations.ps1` against disposable fresh and V1-upgrade
databases before a release. Take and verify an owner-controlled production
backup before applying the migration chain.

Phase 3 adds no provider credentials or public client environment variables.
Provider URLs and attribution are API source constants. The existing
`DATABASE_URL`, auth, CORS, and Web build-time API URL remain the deployment
configuration surface; external provider availability is handled by the
bounded adapter timeout/error policy.

---

## 8. Backup

Minimum production policy:

- Automated daily PostgreSQL backup
- Retention appropriate for personal data importance
- At least one backup copy outside live DB volume
- Periodic restore verification

The repository implementation is bash docker/backup.sh; it writes to a host
BACKUP_DIR outside the named PostgreSQL volume, retains 14 files by default,
and refuses a backup path that resolves inside the inspected live volume.
Use an owner-controlled daily scheduler on the VPS. The cron example and the
2026-08-27 isolated restore result are recorded in
docs/operations/backup-restore-2026-08-27.md.

Recommended restore test:

1. Create isolated database.
2. Restore latest backup.
3. Apply any required migrations.
4. Run smoke queries/application health.

For a Docker-based isolated target, run bash docker/verify-backup-restore.sh
<backup.sql.gz>. Live restore requires the explicit ALLOW_LIVE_RESTORE=1
environment variable and is intentionally not used for verification.

---

## 9. Logs

Production logs should include:

- Timestamp
- Level
- Request ID when applicable
- Route/context
- Safe error message

Never include secrets/passwords/full tokens.

TASK-293 adds request, slow-request, failed-login, failed-import,
failed-exam-submit, liveness, and database-readiness signals to normal API
logs. View recent matching lines with bash docker/recent-errors.sh; set SINCE
and TAIL for a narrower window. The logger records route templates, status,
duration, and request ID only. It never records request bodies, credentials,
tokens, answer keys, or imported content.

---

## 10. Health checks

API health should verify at least:

- Process alive
- Database connection reachable

The public liveness endpoint is /health and the database-backed readiness
endpoint is /health/ready. Both are excluded from the API global prefix and are
safe for container/load-balancer checks without authentication.

Do not make health payload expose sensitive infrastructure details.

---

## 11. CI/CD recommended stages

```text
install
  ↓
lint
  ↓
typecheck
  ↓
unit tests
  ↓
integration tests
  ↓
build web/api
  ↓
migration validation
  ↓
container build
  ↓
deploy
  ↓
smoke test
```

Android mobile Gradle build/lint/unit-test gates may run as a separate workflow or
as an independent job in the project CI.

---

## 12. Release checklist

Before production release:

- [ ] All task acceptance criteria complete
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Critical E2E passes
- [ ] Fresh migration passes
- [ ] No secrets committed
- [ ] Production env validated
- [ ] CORS correct
- [ ] HTTPS correct
- [ ] Backup exists
- [ ] Health endpoint passes
- [ ] Live attempt payload inspected for no answer leakage

The checklist's HTTPS, production backup, and production Android items require
owner-controlled external evidence when the current repository cannot obtain it;
local builds or an emulator must not be substituted for those claims.

---

## 13. Rollback

Application rollback:

- Retain prior deployable image/build.

Database rollback:

- Prefer forward-fix migrations.
- For destructive incidents, restore from verified backup.

Never improvise destructive rollback against production data without a backup.

---

## 14. Operational non-goals

V1 does not require:

- Kubernetes
- Multi-region deployment
- Autoscaling clusters
- Distributed tracing infrastructure
- Enterprise SIEM
