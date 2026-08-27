#!/usr/bin/env bash
# Deploy one immutable Japanese Study Hub application image pair to the VPS.
# This script never removes, recreates, or migrates the PostgreSQL volume.
set -Eeuo pipefail
umask 077

usage() {
  cat >&2 <<'USAGE'
Usage: IMAGE_TAG=<40-character-commit-sha> docker/production-update.sh [--dry-run]

The normal deployment requires IMAGE_TAG to be a published full Git commit SHA.
The script performs a verified
off-volume backup before migrations and only updates the api/web services.
USAGE
}

RUNTIME_DIR="${RUNTIME_DIR:-/opt/japanese-learning-runtime}"
COMPOSE_FILE="${COMPOSE_FILE:-${RUNTIME_DIR}/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-${RUNTIME_DIR}/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-/opt/japanese-learning-backups}"
STATE_DIR="${STATE_DIR:-${RUNTIME_DIR}/state}"
LOG_DIR="${LOG_DIR:-${RUNTIME_DIR}/logs}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-${RUNTIME_DIR}/docker/backup.sh}"
VERIFY_SCRIPT="${VERIFY_SCRIPT:-${RUNTIME_DIR}/docker/verify-backup-restore.sh}"
CURRENT_SHA_FILE="${CURRENT_SHA_FILE:-${STATE_DIR}/current_sha}"
PREVIOUS_SHA_FILE="${PREVIOUS_SHA_FILE:-${STATE_DIR}/previous_successful_sha}"
DEPLOY_HISTORY_FILE="${DEPLOY_HISTORY_FILE:-${STATE_DIR}/deploy-history.log}"
EXPECTED_POSTGRES_VOLUME="${EXPECTED_POSTGRES_VOLUME:-japanese_study_hub_postgres_data}"
IMAGE_TAG="${IMAGE_TAG:-}"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-30}"
HEALTH_DELAY_SECONDS="${HEALTH_DELAY_SECONDS:-2}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-5}"
LOG_RETENTION_COUNT="${LOG_RETENTION_COUNT:-30}"
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

die() {
  echo "Deployment failed: $*" >&2
  if [[ "${TRAP_READY:-0}" == "1" ]]; then
    on_error 1
  fi
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required"
}

validate_positive_integer() {
  local name="$1"
  local value="$2"
  [[ "${value}" =~ ^[1-9][0-9]*$ ]] || die "${name} must be a positive integer"
}

validate_nonnegative_integer() {
  local name="$1"
  local value="$2"
  [[ "${value}" =~ ^[0-9]+$ ]] || die "${name} must be a non-negative integer"
}

mkdir -p -- "${STATE_DIR}" "${LOG_DIR}"
chmod 700 -- "${STATE_DIR}" "${LOG_DIR}"
LOCK_FILE="${DEPLOY_LOCK_FILE:-${RUNTIME_DIR}/operation.lock}"
exec 9>"${LOCK_FILE}"
require_command flock
if ! flock -n 9; then
  die "another deployment is already running for ${RUNTIME_DIR}"
fi

LOG_FILE="${LOG_DIR}/deploy-$(date -u +"%Y%m%dT%H%M%SZ")-${BASHPID}.log"
require_command tee
exec > >(tee -a "${LOG_FILE}") 2>&1

log() {
  printf '%s [deploy] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

read_env_scalar() {
  local key="$1"
  local value
  value="$(awk -v key="${key}" '
    $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
      sub("^[[:space:]]*" key "[[:space:]]*=[[:space:]]*", "", $0)
      sub("[[:space:]]*#.*$", "", $0)
      print $0
    }
  ' "${ENV_FILE}" | tail -n 1)"
  value="${value%$'\r'}"
  if [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
    value="${value#\"}"
    value="${value%\"}"
  elif [[ "${value}" == \'*\' && "${value}" == *\' ]]; then
    value="${value#\'}"
    value="${value%\'}"
  fi
  printf '%s' "${value}"
}

[[ -f "${COMPOSE_FILE}" ]] || die "Compose file not found: ${COMPOSE_FILE}"
[[ -f "${ENV_FILE}" ]] || die "production env file not found: ${ENV_FILE}"
[[ -f "${BACKUP_SCRIPT}" ]] || die "backup script not found: ${BACKUP_SCRIPT}"
[[ -f "${VERIFY_SCRIPT}" ]] || die "backup verification script not found: ${VERIFY_SCRIPT}"

require_command docker
require_command awk
require_command tail
require_command curl
require_command date
require_command find
require_command head
require_command mktemp
require_command mv
require_command rm
require_command sleep
require_command sort
validate_positive_integer HEALTH_ATTEMPTS "${HEALTH_ATTEMPTS}"
validate_nonnegative_integer HEALTH_DELAY_SECONDS "${HEALTH_DELAY_SECONDS}"
validate_positive_integer HEALTH_TIMEOUT_SECONDS "${HEALTH_TIMEOUT_SECONDS}"
validate_positive_integer LOG_RETENTION_COUNT "${LOG_RETENTION_COUNT}"

if [[ -z "${IMAGE_TAG}" ]]; then
  IMAGE_TAG="$(read_env_scalar IMAGE_TAG)"
fi
[[ -n "${IMAGE_TAG}" ]] || die "IMAGE_TAG is required; deploy a published commit SHA"
[[ "${IMAGE_TAG}" =~ ^[0-9a-f]{40}$ ]] ||
  die "IMAGE_TAG must be the full lowercase 40-character Git commit SHA"
export IMAGE_TAG

configured_volume="${POSTGRES_VOLUME_NAME:-}"
env_volume_name="$(read_env_scalar POSTGRES_VOLUME_NAME)"
if [[ -n "${configured_volume}" && -n "${env_volume_name}" &&
  "${configured_volume}" != "${env_volume_name}" ]]; then
  die "POSTGRES_VOLUME_NAME differs between the environment and Compose env file"
fi
configured_volume="${configured_volume:-${env_volume_name:-${EXPECTED_POSTGRES_VOLUME}}}"
[[ "${configured_volume}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]] ||
  die "POSTGRES_VOLUME_NAME contains unsupported characters"
[[ "${configured_volume}" == "${EXPECTED_POSTGRES_VOLUME}" ]] ||
  die "refusing unexpected PostgreSQL volume '${configured_volume}'; expected '${EXPECTED_POSTGRES_VOLUME}'"
export POSTGRES_VOLUME_NAME="${configured_volume}"

COMPOSE_ARGS=(--env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")
compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

compose_with_tag() {
  local tag="$1"
  shift
  IMAGE_TAG="${tag}" docker compose "${COMPOSE_ARGS[@]}" "$@"
}

if ! compose config >/dev/null 2>&1; then
  die "production Compose configuration is invalid"
fi
mapfile -t configured_volumes < <(compose config --volumes 2>/dev/null)
[[ "${#configured_volumes[@]}" -eq 1 && "${configured_volumes[0]}" == "postgres_data" ]] ||
  die "production Compose must expose exactly the postgres_data volume declaration"

PREVIOUS_SHA=""
if [[ -f "${CURRENT_SHA_FILE}" ]]; then
  IFS= read -r PREVIOUS_SHA <"${CURRENT_SHA_FILE}" || true
  [[ "${PREVIOUS_SHA}" =~ ^[0-9a-f]{40}$ ]] ||
    die "current_sha state is invalid; refusing an unmanaged rollback target"
fi

PRIOR_PREVIOUS_SHA=""
if [[ -f "${PREVIOUS_SHA_FILE}" ]]; then
  IFS= read -r PRIOR_PREVIOUS_SHA <"${PREVIOUS_SHA_FILE}" || true
  [[ "${PRIOR_PREVIOUS_SHA}" =~ ^[0-9a-f]{40}$ ]] ||
    die "previous_successful_sha state is invalid; refusing an unmanaged state transition"
fi
[[ -n "${PREVIOUS_SHA}" || -z "${PRIOR_PREVIOUS_SHA}" ]] ||
  die "previous_successful_sha exists without current_sha; refusing an unmanaged state transition"

MIGRATION_APPLIED=0
DEPLOY_PHASE="preflight"
ROLLBACK_ATTEMPTED=0
BACKUP_FILE=""
TRAP_READY=0

append_history() {
  local result="$1"
  local backup_name="${2:-none}"
  local temp_history
  temp_history="$(mktemp "${DEPLOY_HISTORY_FILE}.tmp.XXXXXX")"
  if [[ -f "${DEPLOY_HISTORY_FILE}" ]]; then
    tail -n 49 "${DEPLOY_HISTORY_FILE}" >"${temp_history}" || true
  fi
  printf '%s result=%s image_sha=%s previous_sha=%s backup=%s\n' \
    "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    "${result}" \
    "${IMAGE_TAG}" \
    "${PREVIOUS_SHA:-none}" \
    "${backup_name}" >>"${temp_history}"
  chmod 600 "${temp_history}"
  mv -- "${temp_history}" "${DEPLOY_HISTORY_FILE}"
}

write_state() {
  local target="$1"
  local value="$2"
  local temp_state
  temp_state="$(mktemp "${target}.tmp.XXXXXX")"
  printf '%s\n' "${value}" >"${temp_state}"
  chmod 600 "${temp_state}"
  mv -- "${temp_state}" "${target}"
}

remove_state() {
  rm -f -- "$1"
}

resolve_host_port() {
  local service="$1"
  local container_port="$2"
  local fallback="$3"
  local mapping
  mapping="$(compose port "${service}" "${container_port}" 2>/dev/null | tail -n 1 || true)"
  if [[ "${mapping}" =~ :([0-9]+)$ ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
  else
    printf '%s' "${fallback}"
  fi
}

configure_health_urls() {
  local api_port
  local web_port
  api_port="$(resolve_host_port api 4000 4000)"
  web_port="$(resolve_host_port web 3000 3000)"
  API_LIVENESS_URL="${API_LIVENESS_URL:-http://127.0.0.1:${api_port}/health}"
  API_READY_URL="${API_READY_URL:-${API_HEALTH_URL:-http://127.0.0.1:${api_port}/health/ready}}"
  WEB_HEALTH_URL="${WEB_HEALTH_URL:-http://127.0.0.1:${web_port}/}"
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local attempt
  for ((attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt += 1)); do
    if curl --fail --silent --location --max-time "${HEALTH_TIMEOUT_SECONDS}" \
      "${url}" >/dev/null 2>&1; then
      log "${name} check passed (attempt ${attempt})"
      return 0
    fi
    if [[ "${attempt}" -lt "${HEALTH_ATTEMPTS}" ]]; then
      sleep "${HEALTH_DELAY_SECONDS}"
    fi
  done
  log "${name} check failed after ${HEALTH_ATTEMPTS} attempts" >&2
  return 1
}

wait_for_container_health() {
  local service="$1"
  local attempt
  local container_id
  local health_status
  for ((attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt += 1)); do
    container_id="$(compose ps -q "${service}" 2>/dev/null || true)"
    if [[ -n "${container_id}" ]]; then
      health_status="$(docker inspect -f '{{.State.Health.Status}}' "${container_id}" 2>/dev/null || true)"
      if [[ "${health_status}" == "healthy" ]]; then
        log "${service} container health passed (attempt ${attempt})"
        return 0
      fi
    fi
    if [[ "${attempt}" -lt "${HEALTH_ATTEMPTS}" ]]; then
      sleep "${HEALTH_DELAY_SECONDS}"
    fi
  done
  log "${service} container health failed after ${HEALTH_ATTEMPTS} attempts" >&2
  return 1
}

rollback_application() {
  local rollback_sha="${PREVIOUS_SHA}"
  ROLLBACK_ATTEMPTED=1
  DEPLOY_PHASE="rollback"
  log "Application health failed; attempting rollback to previous successful SHA ${rollback_sha}"
  if ! compose_with_tag "${rollback_sha}" pull api web; then
    log "Rollback image pull failed; no database rollback was attempted" >&2
    return 1
  fi
  if ! compose_with_tag "${rollback_sha}" up -d --no-build --no-deps --force-recreate api web; then
    log "Rollback application recreation failed; no database rollback was attempted" >&2
    return 1
  fi
  configure_health_urls
  if ! wait_for_container_health api ||
    ! wait_for_container_health web ||
    ! wait_for_http "rollback API /health" "${API_LIVENESS_URL}" ||
    ! wait_for_http "rollback API /health/ready" "${API_READY_URL}" ||
    ! wait_for_http "rollback Web" "${WEB_HEALTH_URL}"; then
    log "Rollback health checks failed; manual intervention is required. Database remains forward-only." >&2
    return 1
  fi
  write_state "${CURRENT_SHA_FILE}" "${rollback_sha}"
  if [[ -n "${PRIOR_PREVIOUS_SHA}" && "${PRIOR_PREVIOUS_SHA}" != "${rollback_sha}" ]]; then
    write_state "${PREVIOUS_SHA_FILE}" "${PRIOR_PREVIOUS_SHA}"
  else
    remove_state "${PREVIOUS_SHA_FILE}"
  fi
  log "Application rollback completed to ${rollback_sha}; database was not rolled back"
  return 0
}

on_error() {
  local status="${1:-1}"
  trap - ERR
  log "Deployment stopped during phase ${DEPLOY_PHASE} (exit ${status})"
  if [[ "${MIGRATION_APPLIED}" == "1" &&
    "${ROLLBACK_ATTEMPTED}" == "0" &&
    -n "${PREVIOUS_SHA}" &&
    ( "${DEPLOY_PHASE}" == "application" || "${DEPLOY_PHASE}" == "health" ) ]]; then
    rollback_application || true
  elif [[ "${DEPLOY_PHASE}" == "migration" ]]; then
    log "Migration failed; application containers were not intentionally rolled forward and database was not rolled back"
  elif [[ "${DEPLOY_PHASE}" == "backup" || "${DEPLOY_PHASE}" == "backup-verify" ]]; then
    log "Verified pre-migration backup did not complete; migration was not attempted"
  fi
  append_history "failed" "$(basename -- "${BACKUP_FILE:-none}")" || true
  log "Inspect with: docker compose --env-file '${ENV_FILE}' -f '${COMPOSE_FILE}' ps"
  exit "${status}"
}
trap 'on_error "$?"' ERR
TRAP_READY=1

if [[ "${DRY_RUN}" == "1" ]]; then
  log "Dry run passed for immutable image tag ${IMAGE_TAG}"
  log "Would pull API/Web, ensure PostgreSQL healthy, create and verify an off-volume backup, run Prisma migrations, recreate API/Web, and verify /health, /health/ready, and Web"
  exit 0
fi

log "Starting immutable deployment for image SHA/tag ${IMAGE_TAG}"
if [[ -n "${PREVIOUS_SHA}" ]]; then
  log "Previous successful application SHA: ${PREVIOUS_SHA}"
else
  log "No previous successful SHA is recorded; automatic application rollback is unavailable for this first managed deployment"
fi

DEPLOY_PHASE="pull"
log "Pulling API/Web images from GHCR"
compose pull api web

DEPLOY_PHASE="postgres"
log "Ensuring PostgreSQL is running and healthy; named volume ${configured_volume} is preserved"
compose up -d postgres
wait_for_container_health postgres

DEPLOY_PHASE="backup"
log "Creating project-scoped pre-migration PostgreSQL backup"
BACKUP_DIR="${BACKUP_DIR}" \
COMPOSE_FILE="${COMPOSE_FILE}" \
COMPOSE_ENV_FILE="${ENV_FILE}" \
POSTGRES_VOLUME_NAME="${configured_volume}" \
IMAGE_TAG="${IMAGE_TAG}" \
bash "${BACKUP_SCRIPT}"
BACKUP_FILE="$(find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'japanese_learning_*.sql.gz' -printf '%f\n' | sort -r | head -n 1)"
[[ -n "${BACKUP_FILE}" ]] || die "backup script returned without a backup archive"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"

DEPLOY_PHASE="backup-verify"
log "Verifying backup in a disposable PostgreSQL container"
bash "${VERIFY_SCRIPT}" "${BACKUP_FILE}"

DEPLOY_PHASE="migration"
log "Applying Prisma migrations from the pulled API image"
compose run --rm --no-build --no-deps api ./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma
MIGRATION_APPLIED=1

DEPLOY_PHASE="application"
log "Recreating API/Web only; PostgreSQL service and named volume are untouched"
compose up -d --no-build --no-deps --force-recreate api web
configure_health_urls

DEPLOY_PHASE="health"
wait_for_container_health api
wait_for_container_health web
wait_for_http "API /health" "${API_LIVENESS_URL}"
wait_for_http "API /health/ready" "${API_READY_URL}"
wait_for_http "Web" "${WEB_HEALTH_URL}"

DEPLOY_PHASE="state"
if [[ -n "${PREVIOUS_SHA}" && "${PREVIOUS_SHA}" != "${IMAGE_TAG}" ]]; then
  write_state "${PREVIOUS_SHA_FILE}" "${PREVIOUS_SHA}"
fi
write_state "${CURRENT_SHA_FILE}" "${IMAGE_TAG}"
append_history "succeeded" "$(basename -- "${BACKUP_FILE}")"

DEPLOY_PHASE="cleanup"
cleanup_image_repo() {
  local repository="$1"
  local image_ref
  local image_tag
  mapfile -t image_refs < <(docker image ls "${repository}" --format '{{.Repository}}:{{.Tag}}' | sort -u)
  for image_ref in "${image_refs[@]}"; do
    image_tag="${image_ref##*:}"
    if [[ "${image_tag}" == "latest" ||
      "${image_tag}" == "${IMAGE_TAG}" ||
      "${image_tag}" == "${PREVIOUS_SHA}" ]]; then
      continue
    fi
    if [[ "${image_tag}" =~ ^[0-9a-f]{40}$ ]]; then
      mapfile -t image_users < <(
        docker ps -a --filter "ancestor=${image_ref}" --format '{{.ID}}'
      )
      if [[ "${#image_users[@]}" -gt 0 ]]; then
        log "Keeping image in use by an existing container: ${image_ref}"
        continue
      fi
      if docker image rm "${image_ref}" >/dev/null 2>&1; then
        log "Removed old project image ${image_ref}"
      fi
    fi
  done
}

API_IMAGE_REPOSITORY="$(compose config --images | awk -F: '/japanese-study-hub-api:/{print $1; exit}')"
WEB_IMAGE_REPOSITORY="$(compose config --images | awk -F: '/japanese-study-hub-web:/{print $1; exit}')"
[[ -n "${API_IMAGE_REPOSITORY}" && -n "${WEB_IMAGE_REPOSITORY}" ]] ||
  die "could not resolve project image repositories for bounded cleanup"
cleanup_image_repo "${API_IMAGE_REPOSITORY}"
cleanup_image_repo "${WEB_IMAGE_REPOSITORY}"

mapfile -t old_logs < <(
  find "${LOG_DIR}" -maxdepth 1 -type f -name 'deploy-*.log' -printf '%f\n' | sort -r
)
for ((index = LOG_RETENTION_COUNT; index < ${#old_logs[@]}; index += 1)); do
  rm -f -- "${LOG_DIR}/${old_logs[index]}"
done

compose ps
log "Production deployment completed successfully for ${IMAGE_TAG}"
