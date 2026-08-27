#!/usr/bin/env bash
# Create and verify one Japanese Study Hub production backup.
set -Eeuo pipefail
umask 077

RUNTIME_DIR="${RUNTIME_DIR:-/opt/japanese-learning-runtime}"
COMPOSE_FILE="${COMPOSE_FILE:-${RUNTIME_DIR}/docker-compose.prod.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-${RUNTIME_DIR}/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-/opt/japanese-learning-backups}"
POSTGRES_VOLUME_NAME="${POSTGRES_VOLUME_NAME:-}"
EXPECTED_POSTGRES_VOLUME="${EXPECTED_POSTGRES_VOLUME:-japanese_study_hub_postgres_data}"
CURRENT_SHA_FILE="${CURRENT_SHA_FILE:-${RUNTIME_DIR}/state/current_sha}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-${RUNTIME_DIR}/docker/backup.sh}"
VERIFY_SCRIPT="${VERIFY_SCRIPT:-${RUNTIME_DIR}/docker/verify-backup-restore.sh}"
LOCK_FILE="${BACKUP_LOCK_FILE:-${RUNTIME_DIR}/operation.lock}"

die() {
  echo "Scheduled backup failed: $*" >&2
  exit 1
}

[[ -f "${COMPOSE_FILE}" ]] || die "Compose file not found"
[[ -f "${COMPOSE_ENV_FILE}" ]] || die "production env file not found"
[[ -f "${BACKUP_SCRIPT}" ]] || die "backup script not found"
[[ -f "${VERIFY_SCRIPT}" ]] || die "backup verification script not found"
command -v flock >/dev/null 2>&1 || die "flock is required"
command -v bash >/dev/null 2>&1 || die "bash is required"
command -v docker >/dev/null 2>&1 || die "docker is required"
command -v awk >/dev/null 2>&1 || die "awk is required"
command -v find >/dev/null 2>&1 || die "find is required"
command -v head >/dev/null 2>&1 || die "head is required"
command -v sleep >/dev/null 2>&1 || die "sleep is required"
command -v sort >/dev/null 2>&1 || die "sort is required"
command -v tail >/dev/null 2>&1 || die "tail is required"

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

env_volume_name="$(read_env_scalar POSTGRES_VOLUME_NAME)"
if [[ -n "${POSTGRES_VOLUME_NAME}" && -n "${env_volume_name}" &&
  "${POSTGRES_VOLUME_NAME}" != "${env_volume_name}" ]]; then
  die "POSTGRES_VOLUME_NAME differs between the environment and Compose env file"
fi
POSTGRES_VOLUME_NAME="${POSTGRES_VOLUME_NAME:-${env_volume_name:-${EXPECTED_POSTGRES_VOLUME}}}"
[[ "${POSTGRES_VOLUME_NAME}" == "${EXPECTED_POSTGRES_VOLUME}" ]] ||
  die "refusing unexpected PostgreSQL volume '${POSTGRES_VOLUME_NAME}'"
export POSTGRES_VOLUME_NAME

exec 8>"${LOCK_FILE}"
flock -n 8 || die "another backup or deployment backup is already running"

IMAGE_TAG="${IMAGE_TAG:-}"
if [[ -z "${IMAGE_TAG}" && -f "${CURRENT_SHA_FILE}" ]]; then
  IFS= read -r IMAGE_TAG <"${CURRENT_SHA_FILE}" || true
fi
[[ "${IMAGE_TAG}" =~ ^[0-9a-f]{40}$ ]] ||
  die "a current successful 40-character image SHA is required"
export IMAGE_TAG

COMPOSE_ARGS=(--env-file "${COMPOSE_ENV_FILE}" -f "${COMPOSE_FILE}")
compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

compose up -d postgres
postgres_container="$(compose ps -q postgres 2>/dev/null || true)"
[[ -n "${postgres_container}" ]] || die "PostgreSQL service did not start"
for attempt in $(seq 1 60); do
  postgres_health="$(docker inspect -f '{{.State.Health.Status}}' "${postgres_container}" 2>/dev/null || true)"
  if [[ "${postgres_health}" == "healthy" ]]; then
    break
  fi
  if [[ "${attempt}" == "60" ]]; then
    die "PostgreSQL service did not become healthy"
  fi
  sleep 1
done

echo "Starting project-scoped scheduled backup for image ${IMAGE_TAG}..."
BACKUP_DIR="${BACKUP_DIR}" \
COMPOSE_FILE="${COMPOSE_FILE}" \
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE}" \
POSTGRES_VOLUME_NAME="${POSTGRES_VOLUME_NAME}" \
IMAGE_TAG="${IMAGE_TAG}" \
bash "${BACKUP_SCRIPT}"

latest_backup="$(find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'japanese_learning_*.sql.gz' -printf '%f\n' | sort -r | head -n 1)"
[[ -n "${latest_backup}" ]] || die "backup script returned without an archive"
bash "${VERIFY_SCRIPT}" "${BACKUP_DIR}/${latest_backup}"
echo "Scheduled backup and disposable restore verification completed: ${latest_backup}"
