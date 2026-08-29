# Japanese Study Hub: CI + GHCR and manual production deployment

This runbook matches the current personal-project operating model:

```text
push/merge main
  -> required CI gates
  -> build API/Web Docker images
  -> push :latest and immutable commit-SHA tags to GHCR
  -> STOP
```

Production deployment is manual. GitHub Actions does not SSH to the VPS, does
not copy deployment files, does not log in to Docker on the VPS, and does not
run migrations or health checks against production. No GitHub deployment
environment or VPS credential is required for the workflow.

## Production contract

- Runtime directory: `/opt/japanese-learning-runtime`.
- Server environment: `/opt/japanese-learning-runtime/.env.production`, mode
  `0600`, never committed or uploaded by CI.
- Backup directory: `/opt/japanese-learning-backups`, outside the PostgreSQL
  volume.
- Existing PostgreSQL volume: `japanese_study_hub_postgres_data`. Never rename,
  remove, recreate, or prune it.
- Current topology is direct HTTP: Web on port `3000`, API on port `4000`.
- No Japanese Study Hub domain or TLS virtual host is assumed. Existing Hanaya
  Shop and SmartQueue Nginx hosts are not changed.

## CI and GHCR

The single workflow at `.github/workflows/ci.yml` runs on pull requests and
`main` pushes. It keeps the required static policy, ShellCheck, Compose,
dependency-audit, Node lint/typecheck/unit tests, API PostgreSQL integration,
fresh/V1-to-current migration, Web/API production build, and Android
lint/unit/build gates.

Only a green `main` push reaches the Docker job. The Node job builds the Web and
API application artifacts once; the Docker job packages those artifacts and
pushes:

```text
ghcr.io/nguyentrungnghia1802/japanese-study-hub-api:latest
ghcr.io/nguyentrungnghia1802/japanese-study-hub-api:<40-character-commit-sha>
ghcr.io/nguyentrungnghia1802/japanese-study-hub-web:latest
ghcr.io/nguyentrungnghia1802/japanese-study-hub-web:<40-character-commit-sha>
```

The production Compose file and deployment script reject `latest` for an
operator deployment and require the full commit SHA. Images contain no
application secrets and do not install dependencies when containers start.

## One-time VPS preparation

If the runtime directories, permissions, backup schedule, and operational
scripts are not already installed, run this once from a trusted checkout with
an administrative account:

```bash
scp -P <SSH_PORT> docker/bootstrap-vps.sh \
  <bootstrap-user>@<VPS_HOST>:/tmp/japanese-study-hub-bootstrap.sh

ssh -p <SSH_PORT> <bootstrap-user>@<VPS_HOST> \
  'sudo /bin/bash /tmp/japanese-study-hub-bootstrap.sh --deploy-user <runtime-user>'
```

Start a new session after the runtime user is added to the Docker group. The
bootstrap is idempotent, creates an empty server-only `.env.production` only
when absent, installs a project-scoped daily backup cron entry, and never
touches other Compose projects or any Docker volume.

Populate the environment file without placing real values in Git or shell
history:

```text
GHCR_OWNER=nguyentrungnghia1802
POSTGRES_USER=<database-user>
POSTGRES_PASSWORD=<database-password>
POSTGRES_DB=japanese_learning
DATABASE_URL=postgresql://<database-user>:<url-encoded-password>@postgres:5432/japanese_learning?schema=public
AUTH_USERNAME=<application-username>
AUTH_PASSWORD_HASH=<bcrypt-hash>
AUTH_TOKEN_SECRET=<long-random-secret>
CORS_ORIGINS=http://157.173.127.217:3000
POSTGRES_VOLUME_NAME=japanese_study_hub_postgres_data
BIND_ADDRESS=0.0.0.0
API_PORT=4000
WEB_PORT=3000
UPLOAD_MAX_BYTES=10485760
LOG_LEVEL=info
```

Edit with `sudoedit /opt/japanese-learning-runtime/.env.production` and keep
mode `0600`. Do not change the existing volume name. If the GHCR packages are
private, authenticate interactively on the VPS with a token limited to
`read:packages`; if the packages are public, this step is unnecessary:

```bash
read -rsp 'GHCR read token: ' GHCR_TOKEN
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io \
  --username '<ghcr-username>' --password-stdin
unset GHCR_TOKEN
```

The token must not be pasted into a command-line argument or committed.

## Manual deployment of a published SHA

Use the full SHA from a successful `main` workflow and run these commands on
the VPS. Replace only the placeholder SHA:

```bash
cd /opt/japanese-learning-runtime
NEW_SHA=<40-character-commit-sha>

IMAGE_TAG="$NEW_SHA" \
  bash /opt/japanese-learning-runtime/docker/production-update.sh --dry-run

IMAGE_TAG="$NEW_SHA" \
  bash /opt/japanese-learning-runtime/docker/production-update.sh
```

`production-update.sh` is fail-fast and project-scoped. It takes a shared lock,
pulls only the API/Web images for the SHA, starts/checks only this project's
PostgreSQL service, creates and verifies an off-volume `pg_dump`, runs
`prisma migrate deploy`, recreates only API/Web, and checks PostgreSQL health,
API `/health`, API `/health/ready`, and the Web root. A failed backup aborts
before migration. A post-migration application failure can roll API/Web back to
the previous successful SHA; it never reverses a database migration.

The script records `state/current_sha`, optionally
`state/previous_successful_sha`, bounded state history, and deploy logs under
`/opt/japanese-learning-runtime/logs`. It never runs
`docker system prune --volumes`, `docker compose down -v`, or volume removal.

## Verification

```bash
cd /opt/japanese-learning-runtime

docker compose --env-file .env.production \
  -f docker-compose.prod.yml ps

curl --fail --silent --show-error http://127.0.0.1:4000/health
curl --fail --silent --show-error http://127.0.0.1:4000/health/ready
curl --fail --silent --show-error http://127.0.0.1:3000/

test "$(cat state/current_sha)" = "$NEW_SHA"
docker volume inspect japanese_study_hub_postgres_data >/dev/null
tail -n 100 logs/deploy-*.log
tail -n 100 logs/backup.log
```

Readiness must report database readiness, not merely process liveness. Confirm
the GHCR image SHA, deploy log, and current state before treating the release
as production evidence.

## Manual rollback

Application rollback is image-only and database migrations remain forward-only.
Before deliberately rolling back, verify that the old application supports the
current schema:

```bash
cd /opt/japanese-learning-runtime
ROLLBACK_SHA=<known-40-character-commit-sha>

IMAGE_TAG="$ROLLBACK_SHA" \
  bash /opt/japanese-learning-runtime/docker/production-update.sh
```

The script still takes and verifies a backup and runs `prisma migrate deploy`.
If an older image is incompatible with a newer schema, deploy a forward code
fix instead of attempting to reverse the database migration.

## Backup and restore

Scheduled and pre-migration backups are compressed plain SQL, written outside
the live volume, verified with `gzip -t`, and retained to 14 project archives
by default. The scheduler is independent of CI/GHCR publication and affects only this
project's PostgreSQL service.

Verify a backup without modifying production:

```bash
bash /opt/japanese-learning-runtime/docker/verify-backup-restore.sh \
  /opt/japanese-learning-backups/<backup-file>.sql.gz
```

For an approved live restore, stop API/Web first and keep PostgreSQL running:

```bash
cd /opt/japanese-learning-runtime

docker compose --env-file .env.production \
  -f docker-compose.prod.yml stop api web

ALLOW_LIVE_RESTORE=1 \
  bash /opt/japanese-learning-runtime/docker/restore.sh \
  /opt/japanese-learning-backups/<backup-file>.sql.gz

IMAGE_TAG="$(cat state/current_sha)" \
  bash /opt/japanese-learning-runtime/docker/production-update.sh
```

Live restore requires explicit operator approval and a healthy PostgreSQL
service. It does not delete or recreate the named volume. Never use
`docker compose down -v` or any volume-prune command.

## Future HTTPS edge

When an approved domain and certificate exist, add a separate Japanese Study
Hub reverse-proxy virtual host without changing Hanaya Shop or SmartQueue. Set
`BIND_ADDRESS=127.0.0.1`, proxy the local ports, update `CORS_ORIGINS`, and
publish a new Web image built with the approved HTTPS API URL. Until then, the
documented direct IP/HTTP topology is the only truthful production transport.

## Validation boundary

The repository validates CI policy, shell syntax, ShellCheck, Compose shape,
application tests/builds, migrations, and image publication. Actual VPS
backup, migration, health, restore, and manual deployment results must be
verified by the operator on the server. No production result is inferred from
local Docker availability or an emulator.
