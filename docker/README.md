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
