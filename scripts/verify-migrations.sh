#!/usr/bin/env bash
# Verify fresh migrations and the V1-to-current upgrade path in disposable DBs.
set -Eeuo pipefail
umask 077

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ADMIN_DATABASE_URL="${MIGRATION_ADMIN_DATABASE_URL:-}"
DATABASE_URL_TEMPLATE="${MIGRATION_DATABASE_URL_TEMPLATE:-}"
MIGRATION_DIR="${ROOT_DIR}/apps/api/prisma/migrations"
TEMP_ROOT=""
CREATED_DATABASES=()

die() {
  echo "Migration verification failed: $*" >&2
  exit 1
}

[[ -n "${ADMIN_DATABASE_URL}" ]] || die "MIGRATION_ADMIN_DATABASE_URL is required"
[[ "${DATABASE_URL_TEMPLATE}" == *'%DB%'* ]] ||
  die "MIGRATION_DATABASE_URL_TEMPLATE must contain the %DB% placeholder"
command -v psql >/dev/null 2>&1 || die "psql is required"
command -v pnpm >/dev/null 2>&1 || die "pnpm is required"
command -v cp >/dev/null 2>&1 || die "cp is required"
command -v mktemp >/dev/null 2>&1 || die "mktemp is required"

RUN_SUFFIX="${GITHUB_RUN_ID:-local}_${RANDOM}"
[[ "${RUN_SUFFIX}" =~ ^[A-Za-z0-9_]+$ ]] || die "invalid disposable database suffix"
FRESH_DATABASE="japanese_learning_ci_fresh_${RUN_SUFFIX}"
UPGRADE_DATABASE="japanese_learning_ci_upgrade_${RUN_SUFFIX}"

cleanup() {
  local database
  for database in "${CREATED_DATABASES[@]}"; do
    psql "${ADMIN_DATABASE_URL}" -v ON_ERROR_STOP=1 \
      -c "DROP DATABASE IF EXISTS \"${database}\" WITH (FORCE)" >/dev/null 2>&1 || true
  done
  if [[ -n "${TEMP_ROOT}" ]]; then
    case "${TEMP_ROOT}" in
      /tmp/*|/run/user/*)
        rm -rf -- "${TEMP_ROOT}"
        ;;
      *)
        echo "Refusing to remove unexpected temporary path: ${TEMP_ROOT}" >&2
        ;;
    esac
  fi
}
trap cleanup EXIT

create_database() {
  local database="$1"
  psql "${ADMIN_DATABASE_URL}" -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE \"${database}\"" >/dev/null
  CREATED_DATABASES+=("${database}")
}

database_url() {
  local database="$1"
  printf '%s' "${DATABASE_URL_TEMPLATE//%DB%/${database}}"
}

psql_database_url() {
  local database="$1"
  local url
  url="$(database_url "${database}")"
  url="${url//\?schema=public/}"
  url="${url//&schema=public/}"
  printf '%s' "${url}"
}

apply_migrations() {
  local database="$1"
  local schema="$2"
  local url
  url="$(database_url "${database}")"
  DATABASE_URL="${url}" pnpm --filter @japanese-learning/api exec \
    prisma migrate deploy --schema "${schema}"
}

assert_current_schema() {
  local database="$1"
  local psql_url
  local table
  local table_name
  psql_url="$(psql_database_url "${database}")"
  [[ "$(psql "${psql_url}" -Atq -c 'SELECT count(*) FROM _prisma_migrations')" == "10" ]] ||
    die "${database} does not have exactly ten applied migrations"
  for table_name in \
    flashcards \
    flashcard_review_logs \
    exam_attempts \
    exam_mistakes \
    recent_learning \
    tags \
    flashcard_set_tags \
    exam_tags \
    dictionary_lookup_history \
    dictionary_favorites; do
    table="$(psql "${psql_url}" -Atq -c "SELECT to_regclass('public.${table_name}')")"
    [[ "${table}" == "public.${table_name}" ]] ||
      die "${database} is missing table ${table_name}"
  done
}

TEMP_ROOT="$(mktemp -d)"
V1_SCHEMA_DIR="${TEMP_ROOT}/v1"
mkdir -p "${V1_SCHEMA_DIR}/migrations"
cp "${ROOT_DIR}/apps/api/prisma/schema.prisma" "${V1_SCHEMA_DIR}/schema.prisma"
for migration in \
  20260826000000_init \
  20260826152218_phase2_recent_learning \
  20260826223000_phase2_favorites \
  20260826230000_phase2_tags \
  20260826234000_phase2_fsrs_schema \
  20260826235000_phase2_fsrs_review_snapshots \
  20260827000000_phase2_exam_review; do
  cp -R "${MIGRATION_DIR}/${migration}" "${V1_SCHEMA_DIR}/migrations/"
done

create_database "${FRESH_DATABASE}"
apply_migrations "${FRESH_DATABASE}" "${ROOT_DIR}/apps/api/prisma/schema.prisma"
assert_current_schema "${FRESH_DATABASE}"

create_database "${UPGRADE_DATABASE}"
apply_migrations "${UPGRADE_DATABASE}" "${V1_SCHEMA_DIR}/schema.prisma"
[[ "$(psql "$(psql_database_url "${UPGRADE_DATABASE}")" -Atq -c 'SELECT count(*) FROM _prisma_migrations')" == "7" ]] ||
  die "V1 fixture did not apply exactly seven migrations"
apply_migrations "${UPGRADE_DATABASE}" "${ROOT_DIR}/apps/api/prisma/schema.prisma"
assert_current_schema "${UPGRADE_DATABASE}"

echo "Fresh and V1-to-current migration verification passed."
