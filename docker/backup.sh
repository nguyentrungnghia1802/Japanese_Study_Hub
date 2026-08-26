#!/usr/bin/env bash
# Create a compressed PostgreSQL backup outside the live named data volume.
set -Eeuo pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION_COUNT="${BACKUP_RETENTION_COUNT:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-./docker-compose.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"
POSTGRES_VOLUME_NAME="${POSTGRES_VOLUME_NAME:-japanese_study_hub_postgres_data}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"

if [[ ! "${BACKUP_RETENTION_COUNT}" =~ ^[1-9][0-9]*$ ]]; then
  echo "BACKUP_RETENTION_COUNT must be a positive integer" >&2
  exit 1
fi

mkdir -p -- "${BACKUP_DIR}"
BACKUP_DIR="$(realpath -m -- "${BACKUP_DIR}")"
BACKUP_FILE="${BACKUP_DIR}/japanese_learning_${TIMESTAMP}.sql.gz"
TEMP_FILE="${BACKUP_FILE}.tmp.$$"

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
      echo "Refusing to write backups inside live PostgreSQL volume: ${live_volume_mount}" >&2
      exit 1
      ;;
  esac
fi

cleanup() {
  rm -f -- "${TEMP_FILE}"
}
trap cleanup EXIT

echo "Creating PostgreSQL backup to ${BACKUP_FILE}..."
compose exec -T postgres pg_dump --format=plain --no-owner --no-privileges \
  -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-japanese_learning}" | gzip > "${TEMP_FILE}"
mv -- "${TEMP_FILE}" "${BACKUP_FILE}"
echo "Backup completed successfully: ${BACKUP_FILE} ($(du -h -- "${BACKUP_FILE}" | cut -f1))"

mapfile -t backups < <(
  find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'japanese_learning_*.sql.gz' -printf '%f\n' | sort -r
)
for ((index = BACKUP_RETENTION_COUNT; index < ${#backups[@]}; index += 1)); do
  rm -f -- "${BACKUP_DIR}/${backups[index]}"
done
echo "Retention policy kept ${BACKUP_RETENTION_COUNT} most recent backup(s)."
