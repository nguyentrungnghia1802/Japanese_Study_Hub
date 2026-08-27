#!/usr/bin/env bash
# Restore a backup into a disposable PostgreSQL container and verify the current schema.
set -Eeuo pipefail
umask 077

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <path_to_backup_file.sql.gz>" >&2
  exit 1
fi

BACKUP_FILE="$(realpath -- "$1")"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:16-alpine}"
EXPECTED_MIN_MIGRATIONS="${EXPECTED_MIN_MIGRATIONS:-10}"
RESTORE_CONTAINER="japanese-study-hub-restore-${RANDOM}-${RANDOM}"
RESTORE_DATABASE="restore_check"
RESTORE_PASSWORD="restore_check_${RANDOM}_${RANDOM}"

die() {
  echo "Restore verification failed: $*" >&2
  exit 1
}

[[ -f "${BACKUP_FILE}" ]] || die "backup file not found"
[[ "${EXPECTED_MIN_MIGRATIONS}" =~ ^[1-9][0-9]*$ ]] ||
  die "EXPECTED_MIN_MIGRATIONS must be a positive integer"
command -v docker >/dev/null 2>&1 || die "docker is required"
command -v gunzip >/dev/null 2>&1 || die "gunzip is required"
command -v gzip >/dev/null 2>&1 || die "gzip is required"
command -v realpath >/dev/null 2>&1 || die "realpath is required"
gzip -t -- "${BACKUP_FILE}" || die "backup archive failed gzip verification"

cleanup() {
  docker rm --force "${RESTORE_CONTAINER}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Starting disposable PostgreSQL restore target..."
docker run --detach --rm --name "${RESTORE_CONTAINER}" \
  --label com.japanese-study-hub.restore-check=true \
  --env POSTGRES_PASSWORD="${RESTORE_PASSWORD}" \
  --env POSTGRES_DB="${RESTORE_DATABASE}" "${POSTGRES_IMAGE}" >/dev/null

for attempt in $(seq 1 60); do
  if docker exec "${RESTORE_CONTAINER}" pg_isready -U postgres -d "${RESTORE_DATABASE}" >/dev/null 2>&1; then
    break
  fi
  if [[ "${attempt}" == "60" ]]; then
    die "disposable PostgreSQL did not become ready"
  fi
  sleep 1
done

echo "Restoring backup into the disposable database..."
gunzip -c -- "${BACKUP_FILE}" |
  docker exec -i "${RESTORE_CONTAINER}" psql \
    -v ON_ERROR_STOP=1 --single-transaction -U postgres -d "${RESTORE_DATABASE}" >/dev/null

VERIFY_SQL=$(cat <<'SQL'
DO $$
DECLARE
  required_table text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'flashcard_sets',
    'flashcards',
    'flashcard_review_logs',
    'exam_attempts',
    'exam_mistakes',
    'recent_learning',
    'tags',
    'flashcard_set_tags',
    'exam_tags',
    'dictionary_lookup_history',
    'dictionary_favorites'
  ] LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'missing required table %', required_table;
    END IF;
  END LOOP;
END $$;
DO $$
BEGIN
  IF (SELECT count(*) FROM _prisma_migrations) < :'expected_min_migrations'::integer THEN
    RAISE EXCEPTION 'expected at least % applied migrations, found %', :'expected_min_migrations'::integer, (SELECT count(*) FROM _prisma_migrations);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exam_attempts' AND column_name = 'is_practice'
  ) THEN
    RAISE EXCEPTION 'missing exam_attempts.is_practice column';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exam_mistakes' AND column_name = 'question_content_snapshot'
  ) THEN
    RAISE EXCEPTION 'missing exam_mistakes.question_content_snapshot column';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exam_mistakes' AND column_name = 'submitted_at'
  ) THEN
    RAISE EXCEPTION 'missing exam_mistakes.submitted_at column';
  END IF;
END $$;
SELECT 'migrations=' || count(*) FROM _prisma_migrations;
SELECT 'flashcards=' || count(*) FROM flashcards;
SELECT 'review_logs=' || count(*) FROM flashcard_review_logs;
SELECT 'exam_mistakes=' || count(*) FROM exam_mistakes;
SELECT 'dictionary_history=' || count(*) FROM dictionary_lookup_history;
SELECT 'dictionary_favorites=' || count(*) FROM dictionary_favorites;
SQL
)
docker exec "${RESTORE_CONTAINER}" psql \
  -v ON_ERROR_STOP=1 -v "expected_min_migrations=${EXPECTED_MIN_MIGRATIONS}" \
  -At -U postgres -d "${RESTORE_DATABASE}" -c "${VERIFY_SQL}"
echo "Disposable restore verification passed; the temporary container will now be removed."
