# Local Database Setup

This directory and the root `docker-compose.yml` provide a PostgreSQL 16 instance for local development and testing.

## Starting PostgreSQL

To start the database in the background:

```bash
docker compose up -d
```

## Verifying Database Health

```bash
docker compose ps
```

## Stopping PostgreSQL

```bash
docker compose down
```

To wipe local development data and start fresh:

```bash
docker compose down -v
```

## VPS production update

Copy the production variables to `.env.production` on the VPS only; do not commit
that file. The production Compose file keeps PostgreSQL on an internal Compose
network and uses the named `postgres_data` volume.

Run one update command from the repository checkout:

```bash
bash docker/production-update.sh
```

The script defaults to the owner's `latest` image policy. For a tested immutable
image, set `IMAGE_TAG` in `.env.production` to the published Git SHA. If migration
or health checks fail, the script stops and leaves the existing database volume
intact. Inspect container logs/status before deciding whether to roll back by
setting `IMAGE_TAG` to a previously published SHA and rerunning the same command.
