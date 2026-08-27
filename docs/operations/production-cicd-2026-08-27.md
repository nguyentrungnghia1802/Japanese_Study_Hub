# Japanese Study Hub production CI/CD runbook

This runbook describes the repository-controlled deployment path for the
owner-provided VPS. It does not claim that the GitHub secrets, VPS bootstrap,
production deployment, backup schedule, provider smoke tests, HTTPS, or Android
device/signing gates have been completed. Those require evidence outside this
checkout.

## Production contract

- Runtime: `/opt/japanese-learning-runtime`.
- Server environment: `/opt/japanese-learning-runtime/.env.production`, mode
  `0600`, never committed or copied by GitHub Actions.
- Backup directory: `/opt/japanese-learning-backups`, outside the PostgreSQL
  volume.
- Current direct bindings: Web `3000` and API `4000` over the owner-provided
  IP-only HTTP topology.
- PostgreSQL volume: `japanese_study_hub_postgres_data`; it must not be renamed,
  removed, or recreated by deployment.
- No Japanese Study Hub domain or TLS virtual host is assumed. The bootstrap and
  deployment scripts do not modify Hanaya Shop or SmartQueue Nginx configuration.

## GitHub configuration

Create a GitHub Actions environment named `production`. Add these environment
secrets without printing their values:

| Secret                   | Purpose                                                       |
| ------------------------ | ------------------------------------------------------------- |
| `DEPLOY_HOST`            | VPS hostname or IP supplied by the owner                      |
| `DEPLOY_USER`            | Dedicated VPS user already allowed to run Docker              |
| `DEPLOY_SSH_PRIVATE_KEY` | Private key for that user, preferably a dedicated Ed25519 key |
| `DEPLOY_KNOWN_HOSTS`     | Out-of-band verified host-key line(s), pinned for CI SSH      |
| `DEPLOY_SSH_PORT`        | Optional SSH port; workflow defaults to `22`                  |
| `GHCR_READ_USERNAME`     | GHCR account/service identity used by the VPS                 |
| `GHCR_READ_TOKEN`        | Read-only GHCR token with `read:packages` only                |

The workflow's built-in `GITHUB_TOKEN` receives `packages:write` only in the
image-publish job. It is not copied to the VPS. Do not add `DATABASE_URL`,
`POSTGRES_PASSWORD`, `AUTH_PASSWORD_HASH`, `AUTH_TOKEN_SECRET`, or any private
key to GitHub repository files or Docker build arguments.

`DEPLOY_KNOWN_HOSTS` must be collected and reviewed out of band. The workflow
intentionally does not call `ssh-keyscan`, and SSH uses
`StrictHostKeyChecking=yes`, `BatchMode=yes`, and `IdentitiesOnly=yes`.

## One-time VPS bootstrap

Run these commands from a trusted checkout, replacing every angle-bracket
placeholder with the owner-approved value. The bootstrap user may be a separate
administrative account; the deploy user is the account stored in
`DEPLOY_USER`.

```bash
scp -P <SSH_PORT> docker/bootstrap-vps.sh \
  <bootstrap-user>@<VPS_HOST>:/tmp/japanese-study-hub-bootstrap.sh

ssh -p <SSH_PORT> <bootstrap-user>@<VPS_HOST> \
  'sudo /bin/bash /tmp/japanese-study-hub-bootstrap.sh --deploy-user <deploy-user>'
```

The script is idempotent. It creates the runtime/state/log directories, creates
an empty `0600` `.env.production` only when absent, adds the deploy user to the
Docker group, and installs a project-only daily cron entry at `02:17` by
default. It does not clone the repository, touch existing Nginx hosts, inspect
other Compose projects, or remove any Docker volume. Start a new SSH session
after the Docker-group change.

Populate the server-only environment file, then verify its ownership and mode:

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

Use `sudoedit /opt/japanese-learning-runtime/.env.production`; never put real
values in shell history or this repository. A database password containing
URL-reserved characters must be URL-encoded inside `DATABASE_URL`. The compose
file also reads `POSTGRES_PASSWORD` to initialize or validate the PostgreSQL
service. Do not change the volume name for the existing database.

Before the first release, validate only the Compose configuration and deployment
policy. This does not pull images, start services, migrate, or change data:

```bash
IMAGE_TAG=<40-character-commit-sha> \
  bash /opt/japanese-learning-runtime/docker/production-update.sh --dry-run
```

The scheduled backup intentionally fails closed until a successful managed
deployment has recorded `state/current_sha`; this prevents an unpinned backup
Compose invocation during initial setup.

## First deployment and subsequent releases

Push or merge the reviewed change to `main`. The `workflow_dispatch` option runs
validation only; the GHCR and VPS jobs are deliberately restricted to a `main`
push. A first deployment therefore needs a real, controlled `main` commit (or a
rerun of that commit's push workflow after the environment secrets are fixed).

The workflow will:

1. Run static policy, ShellCheck, Compose, Node, PostgreSQL integration,
   migration-compatibility, dependency-audit, and Android gates.
2. Build API/Web application artifacts once, package them into images, and push
   `ghcr.io/nguyentrungnghia1802/japanese-study-hub-api:<sha>` and
   `...-web:<sha>` plus their `:latest` aliases.
3. Copy only the production Compose file and operational scripts to the runtime
   directory over pinned SSH; `.env.production` remains untouched.
4. Log in to GHCR on the VPS with the read-only token and invoke
   `IMAGE_TAG=<sha> production-update.sh`.

The deployment script serializes with the same operation lock used by scheduled
backups. It pulls images, starts PostgreSQL, performs `pg_dump` to the external
backup directory, verifies the archive in a disposable PostgreSQL container,
runs `prisma migrate deploy`, recreates API/Web only, waits for container health,
`/health`, `/health/ready`, and Web HTTP success, records SHA state/history, and
performs bounded cleanup of old SHA-tagged images for this project only.

## Verification after deployment

Use the pinned SSH identity and the owner-supplied host values. On the VPS:

```bash
cd /opt/japanese-learning-runtime
docker compose --env-file .env.production \
  -f docker-compose.prod.yml ps

curl --fail --silent --show-error http://127.0.0.1:4000/health
curl --fail --silent --show-error http://127.0.0.1:4000/health/ready
curl --fail --silent --show-error http://127.0.0.1:3000/

cat state/current_sha
cat state/previous_successful_sha 2>/dev/null || true
tail -n 100 logs/deploy-*.log
tail -n 100 logs/backup.log
```

The readiness response must report database readiness, not merely process
liveness. Confirm the workflow's deployment job and the corresponding deploy
log before treating the release as production evidence. The scheduled job can
be inspected with:

```bash
sudo cat /etc/cron.d/japanese-study-hub-backup
tail -n 100 /opt/japanese-learning-runtime/logs/backup.log
find /opt/japanese-learning-backups -maxdepth 1 -type f \
  -name 'japanese_learning_*.sql.gz' -printf '%f\n' | sort -r | head
```

## Rollback

The automatic rollback path is limited to API/Web: after migrations succeed, a
post-migration application or health failure causes the script to try the prior
successful SHA if one is recorded and the reverted application becomes healthy.
It never reverses a database migration. If rollback health also fails, the
deployment exits and requires manual intervention.

For a deliberate operator rollback, first record the exact SHA and confirm that
the older application is compatible with the current forward-only schema:

```bash
ROLLBACK_SHA=<known-40-character-commit-sha>
IMAGE_TAG="$ROLLBACK_SHA" \
  bash /opt/japanese-learning-runtime/docker/production-update.sh
```

Run it from the VPS runtime directory or provide the full script path. The
command still takes and verifies a backup and runs `prisma migrate deploy`; a
rollback must not use `latest`, `docker compose down -v`, volume deletion, or a
database migration reversal. Prefer a forward application fix when an old image
is not compatible with the migrated schema.

## Backup and restore

Scheduled and pre-migration backups are project-scoped, compressed plain SQL,
verified with `gzip -t`, retained to 14 archives by default, and written outside
the live volume. The disposable verifier checks the current baseline migration
history (or later forward migrations) and required Phase 3 tables without
attaching the production volume.

To verify an archive without modifying production:

```bash
bash /opt/japanese-learning-runtime/docker/verify-backup-restore.sh \
  /opt/japanese-learning-backups/<backup-file>.sql.gz
```

For an approved live restore, first arrange maintenance so API/Web cannot race
with restored rows. This operation overwrites database rows from the archive;
review the target and backup timestamp before setting the explicit approval:

```bash
cd /opt/japanese-learning-runtime
docker compose --env-file .env.production \
  -f docker-compose.prod.yml stop api web

ALLOW_LIVE_RESTORE=1 \
COMPOSE_FILE=/opt/japanese-learning-runtime/docker-compose.prod.yml \
COMPOSE_ENV_FILE=/opt/japanese-learning-runtime/.env.production \
  bash /opt/japanese-learning-runtime/docker/restore.sh \
  /opt/japanese-learning-backups/<backup-file>.sql.gz

IMAGE_TAG="$(cat state/current_sha)" \
  bash /opt/japanese-learning-runtime/docker/production-update.sh
```

The restore script requires a healthy PostgreSQL service and uses one
transaction. It does not delete or recreate the named volume. Do not run
`docker compose down -v` or any volume-prune command.

## Future HTTPS edge

When the owner supplies an approved domain and certificate, add a separate
Japanese Study Hub reverse-proxy virtual host without changing Hanaya Shop or
SmartQueue. Set `BIND_ADDRESS=127.0.0.1`, proxy the local Web/API ports, update
`CORS_ORIGINS`, and rebuild Web with the approved HTTPS API URL. Until then, the
documented direct IP/HTTP deployment is the only truthful production transport
description.

## Validation boundary in this checkout

The following repository checks are locally reproducible: frozen pnpm install,
Prettier, lint, typecheck, unit tests, dependency audit, YAML/actionlint,
deployment-script Bash syntax, ShellCheck, production policy validation, and
Compose static configuration. The full Web standalone build was attempted on
Windows but Next.js could not create traced dependency symlinks (`EPERM`); the
Ubuntu GitHub runner remains the authoritative production artifact build. The
local Docker client is installed but its Linux daemon was unavailable, so no
local Docker image build, disposable restore, or production health result is
claimed from this checkout.
