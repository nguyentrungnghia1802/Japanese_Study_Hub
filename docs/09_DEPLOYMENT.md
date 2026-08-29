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

The owner-provided VPS contract for this repository is:

- Runtime directory: `/opt/japanese-learning-runtime`.
- Web/API are currently directly reachable on HTTP ports `3000`/`4000`.
- PostgreSQL has no host port in the production Compose file and uses the named
  volume `japanese_study_hub_postgres_data`.
- `.env.production` stays on the VPS and is never synchronized from GitHub.
- No Japanese Study Hub domain, TLS certificate, or reverse-proxy virtual host is
  assumed by this repository. Existing Hanaya Shop and SmartQueue Nginx hosts
  are not modified.

The repository keeps CI/GHCR publication separate from the manual production
runtime. `.github/workflows/ci.yml` stops after a successful GHCR publication;
`docker/production-update.sh` is an operator-run VPS script:

```text
push/merge main
  -> static policy + ShellCheck + Compose validation
  -> Node lint/typecheck/unit tests/dependency audit/production build
  -> PostgreSQL integration tests
  -> fresh and V1-to-current migration checks
  -> Android lint/unit/build/API URL checks
  -> build and push API/Web images to GHCR (:latest and :<commit-sha>)
  -> STOP
```

Pull requests run the validation jobs but do not publish. Only a green `main`
push can reach GHCR. There is no SSH, VPS, or GitHub deployment environment in
the workflow. The application build is produced once by CI and uploaded as an
artifact; Docker image stages package that artifact and do not install
dependencies at container startup. Manual production deployment always receives
`IMAGE_TAG=<40-character-commit-sha>`, never `latest`.

For the manual deployment order, run `docker/production-update.sh` on the VPS.
It takes a project-scoped lock, pulls the two images, starts only PostgreSQL,
creates and verifies an off-volume backup, applies migrations from the API
image, recreates only API/Web, and polls the API liveness endpoint,
database-backed readiness endpoint, and Web root. A failed backup aborts before
migration. If migration has succeeded but application health fails, it attempts
an application-only rollback to the previous successful SHA when one is
recorded and healthy. It never rolls back database migrations and never runs
`docker compose down -v`, removes the PostgreSQL volume, or runs
`docker system prune --volumes`.

The current direct IP/HTTP topology remains an explicit owner-controlled
transport boundary. When an approved domain and HTTPS edge exist, set
`BIND_ADDRESS=127.0.0.1` and configure a new, project-specific Nginx/Caddy
server block that proxies to the existing local ports. Rebuild Web with the
approved HTTPS API URL and update `CORS_ORIGINS` at that time; do not invent a
domain or edit the other projects' virtual hosts.

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

Production Compose/deployment configuration:

```text
GHCR_OWNER
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
POSTGRES_VOLUME_NAME=japanese_study_hub_postgres_data
DATABASE_URL=postgresql://<user>:<url-encoded-password>@postgres:5432/<db>?schema=public
BIND_ADDRESS=0.0.0.0
API_PORT=4000
WEB_PORT=3000
```

`IMAGE_TAG` is supplied by the operator. It may be placed in the VPS env file
for a dry run, but a real release must pass a published immutable commit SHA
explicitly.

Web build configuration:

```text
NEXT_PUBLIC_API_BASE_URL
```

Mobile:

```text
BuildConfig.API_BASE_URL
```

Never expose backend secrets through public-prefixed client variables.

`NEXT_PUBLIC_API_BASE_URL` is embedded into the Next.js browser bundle during
the single CI `next build`. Changing only the running container environment
cannot change the already-built browser bundle. The current workflow embeds the
owner-provided API URL `http://157.173.127.217:4000/api/v1`; a future domain
change requires a new green build and image publication.

The Android API value is embedded into the native binary at Gradle build time. The
debug variant defaults to `http://localhost:4000/api/v1` for local development, while
the installable `production` variant and the release variant default to
`http://157.173.127.217:4000/api/v1`. The `-PapiBaseUrl=...` property overrides
either variant without changing source code. Android cleartext traffic is enabled
for the current HTTP development/production IP and must be replaced with HTTPS when
the deployment endpoint supports it.

Local values:

```text
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001
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

The CI application-build job embeds the production Web API value before the
Docker packaging job runs; the Web Dockerfile does not rebuild it. When
`CORS_ORIGINS` is omitted, the API defaults to the four explicit local
development origins (`localhost` and `127.0.0.1` on ports 3000 and 3001)
outside production and to `http://157.173.127.217:3000` in production. An
explicit `CORS_ORIGINS` value remains authoritative and must include the exact
origin used by the Web browser.

---

## 6. `.env.example`

Repository shall include safe placeholders, for example:

```text
DATABASE_URL=postgresql://user:password@localhost:5432/japanese_learning
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=<generated-hash>
AUTH_TOKEN_SECRET=<replace-me>
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

No real production values.

---

## 7. Database migrations

The manual immutable production deployment order is:

1. Acquire the shared deployment/backup lock and validate the exact production
   Compose volume declaration.
2. Pull the API/Web images for the requested commit SHA.
3. Start PostgreSQL and wait for its Compose healthcheck.
4. Run `docker/backup.sh`, then restore that archive into a disposable
   PostgreSQL container with `docker/verify-backup-restore.sh`.
5. Run `prisma migrate deploy` from the pulled API image.
6. Force-recreate only API/Web and wait for container health, `/health`,
   `/health/ready`, and Web HTTP success.
7. Persist `current_sha`, `previous_successful_sha`, and a bounded deployment
   history, then remove only old SHA-tagged images from this project's two GHCR
   repositories.

If backup or backup verification fails, migration is not attempted. If migration
fails, the old application containers are left in place and the database is
not rolled back. If application health fails after a successful migration, the
script tries the previous application SHA only; database state remains
forward-only. If the migration is not backward-compatible with the old image,
use a forward fix rather than forcing an unsafe image rollback.

Phase 3 extends this sequence to ten checked-in Prisma migrations. The final
dictionary-history, dictionary-favorites, and exam-mistake-retention migrations
must be applied through `prisma migrate deploy`; run
`scripts/verify-migrations.sh` against disposable fresh and V1-to-current
databases before a release. The older PowerShell verifier remains the Phase 2
local-only harness. Take and verify an owner-controlled production backup
before applying the migration chain.

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

The repository implementation is `bash docker/backup.sh`; it uses the
PostgreSQL container's own `POSTGRES_USER`/`POSTGRES_DB`, writes atomically to a
host `BACKUP_DIR` outside the named volume, verifies gzip integrity, and retains
14 project archives by default. The production wrapper
`docker/backup-and-verify.sh` shares the deployment lock, requires the current
successful SHA, and runs disposable restore verification against the current
baseline schema and any later forward migrations. The one-time
`docker/bootstrap-vps.sh` installs an idempotent daily `/etc/cron.d` entry at
02:17 by default. The schedule is project-scoped and does not inspect or prune
other Docker projects; it starts/checks only this project's PostgreSQL service
before taking the backup.

Before the first successful manual deployment the scheduled wrapper fails closed
because no current SHA exists; this does not touch PostgreSQL data. After the
operator installs the wrapper and a deployment records `state/current_sha`, the
schedule can run normally. Keep a second copy of important archives outside the
VPS according to the owner's recovery policy. The existing isolated restore
record is in `docs/operations/backup-restore-2026-08-27.md`.

Recommended restore test:

1. Create isolated database.
2. Restore latest backup.
3. Apply any required migrations.
4. Run smoke queries/application health.

For a Docker-based isolated target, run
`bash docker/verify-backup-restore.sh <backup.sql.gz>`. Live restore requires
the explicit `ALLOW_LIVE_RESTORE=1` environment variable, a healthy PostgreSQL
service, and operator review. It uses one transaction and never deletes the
named volume. Stop API/Web first if the restored rows must not race with live
writes; then recreate the current application SHA.

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

## 11. CI and manual deployment stages

```text
static policy / ShellCheck / Compose config
  ↓
Node lint + typecheck + unit tests + dependency audit + production artifact build
  ↓
API PostgreSQL integration tests + fresh/V1 migration compatibility
  ↓
Android lint + unit tests + debug/production/release APK build
  ↓
Docker package/push (:latest + :<commit-sha>) [main only]
  ↓
STOP — operator runs the manual VPS deployment commands
```

Android is an independent job in the same workflow and is a required dependency
of image publication; it is never deployed as Web/API. The Docker job consumes
the already-built Web/API artifact from the Node job. No GitHub Action performs
VPS access or production deployment.

---

## 12. Release checklist

Before production release:

- [ ] All task acceptance criteria complete
- [ ] The `main` workflow is green through all required validation jobs
- [ ] GHCR contains both `latest` and the exact deployed commit SHA
- [ ] Manual VPS runtime `.env.production`, GHCR read login, and backup schedule
      have been verified by the owner
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

The checklist's deployed image, VPS backup/restore, production health/provider,
HTTPS, and physical Android/signing items require owner-controlled evidence;
local builds or an emulator must not be substituted for those claims.

---

## 13. Rollback

Application rollback:

- Record the current SHA before any manual rollback.
- Rerun `production-update.sh` with that exact 40-character SHA only after
  confirming the newer migration is backward-compatible with the old image.
- The manual script may restore API/Web to the previous successful SHA after a
  post-migration application health failure; it does not undo database changes.

Database rollback:

- Prefer forward-fix migrations.
- For destructive incidents, restore from verified backup.

Never improvise destructive rollback against production data without a verified
backup. Exact operator commands are maintained in
`docs/operations/production-cicd-2026-08-27.md`.

---

## 14. Operational non-goals

V1 does not require:

- Kubernetes
- Multi-region deployment
- Autoscaling clusters
- Distributed tracing infrastructure
- Enterprise SIEM
