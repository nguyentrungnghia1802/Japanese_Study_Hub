#!/usr/bin/env bash
# Pull and safely roll the latest GHCR images for the personal VPS deployment.
# The script intentionally never removes named database volumes.
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_DIR}/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-${REPO_DIR}/.env.production}"
API_PORT="${API_PORT:-4000}"
WEB_PORT="${WEB_PORT:-3000}"
API_HEALTH_URL="${API_HEALTH_URL:-http://127.0.0.1:${API_PORT}/health}"
WEB_HEALTH_URL="${WEB_HEALTH_URL:-http://127.0.0.1:${WEB_PORT}/}"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-30}"
HEALTH_DELAY_SECONDS="${HEALTH_DELAY_SECONDS:-2}"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Production env file not found: ${ENV_FILE}" >&2
  echo "Create it from the documented deployment variables; never commit secrets." >&2
  exit 1
fi
command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
command -v curl >/dev/null || { echo "curl is required for post-deploy health checks" >&2; exit 1; }

COMPOSE_ARGS=(--env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")
compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

on_error() {
  echo "Production update stopped; no automatic destructive rollback was attempted." >&2
  echo "Inspect with: docker compose --env-file '${ENV_FILE}' -f '${COMPOSE_FILE}' ps" >&2
  exit 1
}
trap on_error ERR

echo "Validating production Compose configuration..."
compose config >/dev/null

echo "Pulling GHCR images (IMAGE_TAG=${IMAGE_TAG:-latest})..."
compose pull api web

echo "Ensuring PostgreSQL is healthy before migration..."
compose up -d postgres
compose ps postgres

echo "Applying Prisma migrations before application recreation..."
compose run --rm --no-deps api pnpm --filter @japanese-learning/api prisma:deploy

echo "Recreating API and Web containers without rebuilding or touching volumes..."
compose up -d --no-build --force-recreate api web

wait_for_health() {
  local name="$1"
  local url="$2"
  local attempt
  for ((attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt += 1)); do
    if curl --fail --silent --show-error --max-time 5 "${url}" >/dev/null; then
      echo "${name} health check passed (${url})"
      return 0
    fi
    sleep "${HEALTH_DELAY_SECONDS}"
  done
  echo "${name} health check failed after ${HEALTH_ATTEMPTS} attempts: ${url}" >&2
  return 1
}

wait_for_health "API" "${API_HEALTH_URL}"
wait_for_health "Web" "${WEB_HEALTH_URL}"

echo "Recent container status:"
compose ps
echo "Pruning dangling images only (named volumes are untouched)..."
docker image prune --force
echo "Production update completed successfully."
