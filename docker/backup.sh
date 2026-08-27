#!/usr/bin/env bash
# Create a compressed PostgreSQL backup outside the live named data volume.
set -Eeuo pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION_COUNT="${BACKUP_RETENTION_COUNT:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-./docker-compose.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"
POSTGRES_VOLUME_NAME="${POSTGRES_VOLUME_NAME:-}"
EXPECTED_POSTGRES_VOLUME="${EXPECTED_POSTGRES_VOLUME:-japanese_study_hub_postgres_data}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"

die() {
  echo "Backup failed: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required"
}

if [[ ! "${BACKUP_RETENTION_COUNT}" =~ ^[1-9][0-9]*$ ]]; then
  die "BACKUP_RETENTION_COUNT must be a positive integer"
fi
[[ -f "${COMPOSE_FILE}" ]] || die "Compose file not found: ${COMPOSE_FILE}"
if [[ -n "${COMPOSE_ENV_FILE}" ]]; then
  [[ -f "${COMPOSE_ENV_FILE}" ]] || die "Compose env file not found: ${COMPOSE_ENV_FILE}"
fi

require_command docker
require_command date
require_command find
require_command gzip
require_command realpath
require_command mv
require_command du
require_command cut
require_command awk
require_command tail

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

env_volume_name=""
if [[ -n "${COMPOSE_ENV_FILE}" ]]; then
  env_volume_name="$(read_env_scalar POSTGRES_VOLUME_NAME)"
fi
if [[ -n "${POSTGRES_VOLUME_NAME}" && -n "${env_volume_name}" &&
  "${POSTGRES_VOLUME_NAME}" != "${env_volume_name}" ]]; then
  die "POSTGRES_VOLUME_NAME differs between the environment and Compose env file"
fi
POSTGRES_VOLUME_NAME="${POSTGRES_VOLUME_NAME:-${env_volume_name:-${EXPECTED_POSTGRES_VOLUME}}}"
[[ "${POSTGRES_VOLUME_NAME}" == "${EXPECTED_POSTGRES_VOLUME}" ]] ||
  die "refusing unexpected PostgreSQL volume '${POSTGRES_VOLUME_NAME}'"
export POSTGRES_VOLUME_NAME

mkdir -p -- "${BACKUP_DIR}"
BACKUP_DIR="$(realpath -m -- "${BACKUP_DIR}")"
BACKUP_FILE="${BACKUP_DIR}/japanese_learning_${TIMESTAMP}_${BASHPID}.sql.gz"
TEMP_FILE="${BACKUP_FILE}.tmp"

if [[ -n "${COMPOSE_ENV_FILE}" ]]; then
  COMPOSE_ARGS=(-f "${COMPOSE_FILE}" --env-file "${COMPOSE_ENV_FILE}")
else
  COMPOSE_ARGS=(-f "${COMPOSE_FILE}")
fi

compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

live_volume_mount="$(docker volume inspect -f '{{.Mountpoint}}' "${POSTGRES_VOLUME_NAME}" 2>/dev/null || true)"
if [[ -n "${live_volume_mount}" ]]; then
  live_volume_mount="$(realpath -m -- "${live_volume_mount}")"
  case "${BACKUP_DIR}/" in
    "${live_volume_mount}/"*|"${live_volume_mount}")
      die "refusing to write inside live PostgreSQL volume"
      ;;
  esac
fi

cleanup() {
  rm -f -- "${TEMP_FILE}"
}
trap cleanup EXIT

echo "Creating Japanese Study Hub PostgreSQL backup..."
compose exec -T postgres sh -c \
  'pg_dump --format=plain --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' |
  gzip >"${TEMP_FILE}"

[[ -s "${TEMP_FILE}" ]] || die "backup archive is empty"
gzip -t -- "${TEMP_FILE}" || die "backup archive failed gzip verification"
mv -- "${TEMP_FILE}" "${BACKUP_FILE}"

echo "Backup completed: ${BACKUP_FILE} ($(du -h -- "${BACKUP_FILE}" | cut -f1))"

mapfile -t backups < <(
  find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'japanese_learning_*.sql.gz' -printf '%f\n' |
    sort -r
)
for ((index = BACKUP_RETENTION_COUNT; index < ${#backups[@]}; index += 1)); do
  rm -f -- "${BACKUP_DIR}/${backups[index]}"
done
echo "Retention policy kept ${BACKUP_RETENTION_COUNT} most recent backup(s)."
