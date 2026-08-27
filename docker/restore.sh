#!/usr/bin/env bash
# Restore a backup into the live database only with explicit operator approval.
set -Eeuo pipefail
umask 077

if [[ $# -ne 1 ]]; then
  echo "Usage: ALLOW_LIVE_RESTORE=1 $0 <path_to_backup_file.sql.gz>" >&2
  exit 1
fi

BACKUP_FILE="$1"
RUNTIME_DIR="${RUNTIME_DIR:-/opt/japanese-learning-runtime}"
COMPOSE_FILE="${COMPOSE_FILE:-${RUNTIME_DIR}/docker-compose.prod.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-${RUNTIME_DIR}/.env.production}"
POSTGRES_VOLUME_NAME="${POSTGRES_VOLUME_NAME:-}"
EXPECTED_POSTGRES_VOLUME="${EXPECTED_POSTGRES_VOLUME:-japanese_study_hub_postgres_data}"

die() {
  echo "Restore failed: $*" >&2
  exit 1
}

[[ -f "${BACKUP_FILE}" ]] || die "backup file not found"
[[ "${ALLOW_LIVE_RESTORE:-0}" == "1" ]] ||
  die "refusing live restore; set ALLOW_LIVE_RESTORE=1 after reviewing the target"
[[ -f "${COMPOSE_FILE}" ]] || die "Compose file not found: ${COMPOSE_FILE}"
command -v docker >/dev/null 2>&1 || die "docker is required"
command -v gunzip >/dev/null 2>&1 || die "gunzip is required"
command -v gzip >/dev/null 2>&1 || die "gzip is required"
command -v awk >/dev/null 2>&1 || die "awk is required"
command -v tail >/dev/null 2>&1 || die "tail is required"
gzip -t -- "${BACKUP_FILE}" || die "backup archive failed gzip verification"

if [[ -n "${COMPOSE_ENV_FILE}" ]]; then
  [[ -f "${COMPOSE_ENV_FILE}" ]] || die "Compose env file not found: ${COMPOSE_ENV_FILE}"
  COMPOSE_ARGS=(-f "${COMPOSE_FILE}" --env-file "${COMPOSE_ENV_FILE}")
else
  COMPOSE_ARGS=(-f "${COMPOSE_FILE}")
fi

read_env_scalar() {
  local key="$1"
  local value
  value="$(awk -v key="${key}" '
    $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
      sub("^[[:space:]]*" key "[[:space:]]*=[[:space:]]*", "", $0)
      sub("[[:space:]]*#.*$", "", $0)
      print $0
    }
  ' "${COMPOSE_ENV_FILE}" | tail -n 1)"
  value="${value%$'\r'}"
  if [[ "${value}" == \"* && "${value}" == *\" ]]; then
    value="${value#\"}"
    value="${value%\"}"
  elif [[ "${value}" == \'* && "${value}" == *\' ]]; then
    value="${value#\'}"
    value="${value%\'}"
  fi
  printf '%s' "${value}"
}

if [[ -z "${POSTGRES_VOLUME_NAME}" && -n "${COMPOSE_ENV_FILE}" ]]; then
  POSTGRES_VOLUME_NAME="$(read_env_scalar POSTGRES_VOLUME_NAME)"
fi
POSTGRES_VOLUME_NAME="${POSTGRES_VOLUME_NAME:-${EXPECTED_POSTGRES_VOLUME}}"
[[ "${POSTGRES_VOLUME_NAME}" == "${EXPECTED_POSTGRES_VOLUME}" ]] ||
  die "refusing unexpected PostgreSQL volume '${POSTGRES_VOLUME_NAME}'"

compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

postgres_container="$(compose ps -q postgres 2>/dev/null || true)"
[[ -n "${postgres_container}" ]] || die "PostgreSQL service is not running"
postgres_health="$(docker inspect -f '{{.State.Health.Status}}' "${postgres_container}" 2>/dev/null || true)"
[[ "${postgres_health}" == "healthy" ]] || die "PostgreSQL service is not healthy"
echo "Restoring the verified backup into the live database; existing rows may be overwritten."
gunzip -c -- "${BACKUP_FILE}" |
  compose exec -T postgres sh -c \
    'psql -v ON_ERROR_STOP=1 --single-transaction -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
echo "Database restore completed successfully."
