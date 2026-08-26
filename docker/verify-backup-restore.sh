#!/usr/bin/env bash
# Restore a backup into a disposable PostgreSQL container and verify Phase 2 tables.
set -Eeuo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path_to_backup_file.sql.gz>" >&2
  exit 1
fi

BACKUP_FILE="$(realpath -- "$1")"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:16-alpine}"
RESTORE_CONTAINER="japanese-study-hub-restore-${RANDOM}-${RANDOM}"
RESTORE_DATABASE="restore_check"
RESTORE_PASSWORD="${RESTORE_PASSWORD:-phase2_restore_check_${RANDOM}_${RANDOM}}"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi
command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
command -v gunzip >/dev/null || { echo "gunzip is required" >&2; exit 1; }

cleanup() {
  docker rm --force "${RESTORE_CONTAINER}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Starting disposable PostgreSQL restore target..."
docker run --detach --rm --name "${RESTORE_CONTAINER}" \
  --env POSTGRES_PASSWORD="${RESTORE_PASSWORD}" \
  --env POSTGRES_DB="${RESTORE_DATABASE}" "${POSTGRES_IMAGE}" >/dev/null

for attempt in $(seq 1 60); do
  if docker exec "${RESTORE_CONTAINER}" pg_isready -U postgres -d "${RESTORE_DATABASE}" >/dev/null 2>&1; then
    break
  fi
  if [[ "${attempt}" == "60" ]]; then
    echo "Disposable PostgreSQL did not become ready" >&2
    exit 1
  fi
  sleep 1
done

echo "Restoring ${BACKUP_FILE} into the disposable database..."
gunzip -c -- "${BACKUP_FILE}" | docker exec -i "${RESTORE_CONTAINER}" psql \
  -v ON_ERROR_STOP=1 --single-transaction -U postgres -d "${RESTORE_DATABASE}"

VERIFY_SQL=$(cat <<'SQL'
DO $$
DECLARE
  required_table text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY['recent_learning', 'tags', 'flashcard_review_logs', 'exam_mistakes'] LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'missing Phase 2 table %', required_table;
    END IF;
  END LOOP;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exam_attempts' AND column_name = 'is_practice'
  ) THEN
    RAISE EXCEPTION 'missing Phase 2 exam_attempts.is_practice column';
  END IF;
END $$;
SELECT 'flashcards=' || count(*) FROM flashcards;
SELECT 'review_logs=' || count(*) FROM flashcard_review_logs;
SELECT 'exam_mistakes=' || count(*) FROM exam_mistakes;
SQL
)
docker exec "${RESTORE_CONTAINER}" psql -v ON_ERROR_STOP=1 -At -U postgres -d "${RESTORE_DATABASE}" -c "${VERIFY_SQL}"
echo "Disposable restore verification passed; the container will now be removed."
