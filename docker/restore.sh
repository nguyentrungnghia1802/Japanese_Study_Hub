#!/usr/bin/env bash
# Restore a backup into the live database only with explicit operator approval.
set -Eeuo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ALLOW_LIVE_RESTORE=1 $0 <path_to_backup_file.sql.gz>" >&2
  exit 1
fi

BACKUP_FILE="$1"
COMPOSE_FILE="${COMPOSE_FILE:-./docker-compose.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"
if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi
if [[ "${ALLOW_LIVE_RESTORE:-0}" != "1" ]]; then
  echo "Refusing live restore. Set ALLOW_LIVE_RESTORE=1 after reviewing the target." >&2
  exit 1
fi
command -v gunzip >/dev/null || { echo "gunzip is required" >&2; exit 1; }

if [[ -n "${COMPOSE_ENV_FILE}" ]]; then
  COMPOSE_ARGS=(-f "${COMPOSE_FILE}" --env-file "${COMPOSE_ENV_FILE}")
else
  COMPOSE_ARGS=(-f "${COMPOSE_FILE}")
fi
compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

echo "Restoring database from ${BACKUP_FILE}; the live database may be overwritten."
gunzip -c -- "${BACKUP_FILE}" | compose exec -T postgres psql \
  -v ON_ERROR_STOP=1 --single-transaction \
  -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-japanese_learning}"
echo "Database restore completed successfully."
