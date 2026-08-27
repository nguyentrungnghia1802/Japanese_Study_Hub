# Docker and production operations

`docker-compose.yml` is the local PostgreSQL-only development stack. It is safe
to stop with `docker compose down`; `docker compose down -v` is intentionally a
local-development-only data reset and must never be used against production.

`docker-compose.prod.yml` is the production runtime contract. It runs
PostgreSQL, API, and Web, keeps PostgreSQL off the host network, binds Web/API
through `BIND_ADDRESS`, and names the existing database volume
`japanese_study_hub_postgres_data`.

## Production artifacts

- `Dockerfile.api` packages the CI-built API `dist`, Prisma schema/migrations,
  generated Prisma client, and production dependencies. It does not compile or
  install dependencies at container startup.
- `Dockerfile.web` packages the CI-built Next.js standalone server, static files,
  and public files. It does not run `next build` or install dependencies at
  startup.
- `.dockerignore` deliberately re-includes only the CI-downloaded production
  artifact paths needed by these two Dockerfiles.

## Production scripts

- `bootstrap-vps.sh`: one-time, idempotent setup for
  `/opt/japanese-learning-runtime`, state/log directories, permissions, and the
  project-only daily backup cron entry. It never changes `.env.production` when
  that file already exists.
- `production-update.sh`: immutable deploy, shared lock, pre-migration backup
  and disposable restore verification, Prisma migration, API/Web recreation,
  health checks, SHA state/history, automatic application-only rollback, and
  bounded project-image cleanup.
- `backup.sh`: atomic compressed `pg_dump` outside the live volume with gzip
  verification and a 14-file retention bound.
- `backup-and-verify.sh`: scheduled project backup wrapper that uses the current
  successful image SHA, ensures PostgreSQL is healthy, and shares the operation
  lock.
- `verify-backup-restore.sh`: disposable PostgreSQL restore and current-baseline
  schema verification; it never attaches the production volume. It accepts the
  baseline migration history plus later forward migrations, so a pre-migration
  archive remains verifiable after the schema grows.
- `restore.sh`: explicit-approval live restore into the healthy production
  PostgreSQL service; it never deletes or recreates the named volume.
- `recent-errors.sh`: bounded view of project API logs.
- `validate-production-artifacts.sh`: Bash syntax, Compose policy, and
  destructive-volume-safety checks used by CI.

## Operator commands

The first-time VPS bootstrap, required GitHub secrets, deploy/rollback commands,
and restore procedure are maintained in
`docs/operations/production-cicd-2026-08-27.md`.

For a non-mutating production preflight on the VPS:

```bash
IMAGE_TAG=<40-character-commit-sha> \
  bash /opt/japanese-learning-runtime/docker/production-update.sh --dry-run
```

For an operator-approved immutable deployment:

```bash
IMAGE_TAG=<40-character-commit-sha> \
  bash /opt/japanese-learning-runtime/docker/production-update.sh
```

Never use `latest` for a production command, never run `docker compose down -v`,
and never run `docker system prune --volumes`. The scripts are scoped to this
project and do not clean up other Docker projects on the VPS.
