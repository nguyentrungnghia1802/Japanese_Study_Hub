#!/usr/bin/env bash
# Show recent safe API/Web warning and error signals from normal container logs.
set -Eeuo pipefail

RUNTIME_DIR="${RUNTIME_DIR:-/opt/japanese-learning-runtime}"
COMPOSE_FILE="${COMPOSE_FILE:-${RUNTIME_DIR}/docker-compose.prod.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-${RUNTIME_DIR}/.env.production}"
SINCE="${SINCE:-1h}"
TAIL="${TAIL:-300}"

if [[ -n "${COMPOSE_ENV_FILE}" ]]; then
  COMPOSE_ARGS=(-f "${COMPOSE_FILE}" --env-file "${COMPOSE_ENV_FILE}")
else
  COMPOSE_ARGS=(-f "${COMPOSE_FILE}")
fi

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }

docker compose "${COMPOSE_ARGS[@]}" logs --since "${SINCE}" --tail "${TAIL}" --no-color api web 2>&1 |
  grep -E 'ERROR|WARN|failed_login|failed_import|failed_exam_submit|slow_request' || true
