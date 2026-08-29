#!/usr/bin/env bash
# Static policy and syntax validation for the production artifacts.
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

die() {
  echo "Production artifact validation failed: $*" >&2
  exit 1
}

command -v bash >/dev/null 2>&1 || die "bash is required"
command -v grep >/dev/null 2>&1 || die "grep is required"

for script in \
  "${SCRIPT_DIR}/backup.sh" \
  "${SCRIPT_DIR}/backup-and-verify.sh" \
  "${SCRIPT_DIR}/restore.sh" \
  "${SCRIPT_DIR}/verify-backup-restore.sh" \
  "${SCRIPT_DIR}/production-update.sh" \
  "${SCRIPT_DIR}/bootstrap-vps.sh" \
  "${SCRIPT_DIR}/recent-errors.sh"; do
  [[ -f "${script}" ]] || die "missing script: ${script}"
  bash -n "${script}" || die "invalid Bash syntax: ${script}"
done

compose_file="${REPO_DIR}/docker-compose.prod.yml"
[[ -f "${compose_file}" ]] || die "missing production Compose file"
[[ -f "${REPO_DIR}/docker/Dockerfile.api" ]] || die "missing API Dockerfile"
[[ -f "${REPO_DIR}/docker/Dockerfile.web" ]] || die "missing Web Dockerfile"
grep -Eq 'pnpm --dir /out exec prisma generate' "${REPO_DIR}/docker/Dockerfile.api" ||
  die "API image must generate Prisma Client in the production dependency tree"
grep -Eq "output: 'standalone'" "${REPO_DIR}/apps/web/next.config.js" ||
  die "Web must use the standalone production output"
for artifact_path in \
  'apps/web/.next' \
  'apps/api/dist' \
  'packages/contracts/dist' \
  'packages/shared/dist'; do
  grep -Fq "!${artifact_path}/" "${REPO_DIR}/.dockerignore" ||
    die "Docker context must retain CI artifact path ${artifact_path}"
done
grep -Eq 'IMAGE_TAG:\?IMAGE_TAG_is_required' "${compose_file}" ||
  die "production Compose must require IMAGE_TAG"
grep -Eq 'name: \$\{POSTGRES_VOLUME_NAME:-japanese_study_hub_postgres_data\}' "${compose_file}" ||
  die "production Compose must retain the project PostgreSQL volume name"
grep -Eq 'BIND_ADDRESS:-0\.0\.0\.0' "${compose_file}" ||
  die "production Compose must expose an explicit bind-address control"

workflow_file="${REPO_DIR}/.github/workflows/ci.yml"
[[ -f "${workflow_file}" ]] || die "missing CI workflow"
for forbidden in \
  'DEPLOY_HOST' \
  'DEPLOY_USER' \
  'DEPLOY_SSH_PRIVATE_KEY' \
  'DEPLOY_KNOWN_HOSTS' \
  'DEPLOY_SSH_PORT' \
  'environment: production' \
  'deploy-production' \
  'ssh' \
  'scp'; do
  if grep -Fqi -- "${forbidden}" "${workflow_file}"; then
    die "CI workflow must not contain automatic VPS/CD marker: ${forbidden}"
  fi
done
grep -Fq 'docker-publish:' "${workflow_file}" ||
  die "CI workflow must retain the GHCR publish job"
grep -Fq 'packages: write' "${workflow_file}" ||
  die "GHCR publish job must retain packages:write permission"
grep -Fq 'japanese-study-hub-${{ matrix.name }}:latest' "${workflow_file}" ||
  die "GHCR publish must retain the latest API/Web tags"
grep -Fq 'japanese-study-hub-${{ matrix.name }}:${{ github.sha }}' "${workflow_file}" ||
  die "GHCR publish must retain the immutable commit-SHA tag"

production_script="${SCRIPT_DIR}/production-update.sh"
grep -Eq 'flock -n' "${production_script}" || die "deployment must serialize with flock"
grep -Eq '\^\[0-9a-f\]\{40\}\$' "${production_script}" ||
  die "deployment must require a full immutable commit SHA"
grep -Eq 'backup-and-verify|verify-backup-restore' "${production_script}" ||
  die "deployment must verify a pre-migration backup"
grep -Eq 'prisma migrate deploy' "${production_script}" ||
  die "deployment must use prisma migrate deploy"
grep -Eq 'health' "${production_script}" || die "deployment must check API liveness"
grep -Eq 'health/ready' "${production_script}" || die "deployment must check API readiness"
grep -Eq 'force-recreate api web' "${production_script}" ||
  die "deployment must recreate only application services"
grep -Eq 'docker image rm' "${production_script}" ||
  die "image cleanup must be project-scoped"

if grep -Ein \
  'docker system prune.*--volumes|docker volume rm|docker compose .*down[[:space:]]+-v' \
  "${SCRIPT_DIR}/backup.sh" \
  "${SCRIPT_DIR}/backup-and-verify.sh" \
  "${SCRIPT_DIR}/restore.sh" \
  "${SCRIPT_DIR}/verify-backup-restore.sh" \
  "${SCRIPT_DIR}/production-update.sh" \
  "${SCRIPT_DIR}/bootstrap-vps.sh" \
  "${SCRIPT_DIR}/recent-errors.sh"; then
  die "destructive volume cleanup is forbidden in production scripts"
fi

grep -Eq 'pg_dump' "${SCRIPT_DIR}/backup.sh" || die "backup script must invoke pg_dump"
grep -Eq 'gzip -t' "${SCRIPT_DIR}/backup.sh" || die "backup script must verify gzip integrity"
grep -Eq 'ALLOW_LIVE_RESTORE' "${SCRIPT_DIR}/restore.sh" ||
  die "live restore must require explicit operator approval"
grep -Eq 'dictionary_lookup_history' "${SCRIPT_DIR}/verify-backup-restore.sh" ||
  die "restore verification must cover Phase 3 schema"

echo "Production artifact syntax and safety policy validation passed."
