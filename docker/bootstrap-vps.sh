#!/usr/bin/env bash
# One-time, project-scoped VPS bootstrap for Japanese Study Hub.
# This script creates directories and a daily backup schedule only. It does not
# modify Nginx, other Compose projects, or PostgreSQL data.
set -Eeuo pipefail
umask 077

RUNTIME_DIR="/opt/japanese-learning-runtime"
BACKUP_DIR="/opt/japanese-learning-backups"
DEPLOY_USER=""
BACKUP_MINUTE="17"
BACKUP_HOUR="2"

usage() {
  cat <<'USAGE'
Usage: sudo bash bootstrap-vps.sh --deploy-user <linux-user>

Optional:
  --backup-minute <0-59>  Default: 17
  --backup-hour <0-23>    Default: 2
USAGE
}

die() {
  echo "VPS bootstrap failed: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --deploy-user)
      [[ $# -ge 2 ]] || die "--deploy-user requires a value"
      DEPLOY_USER="$2"
      shift 2
      ;;
    --backup-minute)
      [[ $# -ge 2 ]] || die "--backup-minute requires a value"
      BACKUP_MINUTE="$2"
      shift 2
      ;;
    --backup-hour)
      [[ $# -ge 2 ]] || die "--backup-hour requires a value"
      BACKUP_HOUR="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "unknown argument: $1"
      ;;
  esac
done

[[ "${EUID}" -eq 0 ]] || die "run this one-time bootstrap with sudo"
[[ -n "${DEPLOY_USER}" ]] || die "--deploy-user is required"
[[ "${DEPLOY_USER}" =~ ^[a-z_][a-z0-9_-]*[$]?$ ]] ||
  die "deploy user contains unsupported characters"
id "${DEPLOY_USER}" >/dev/null 2>&1 || die "deploy user does not exist"
DEPLOY_GROUP="$(id -gn "${DEPLOY_USER}")"
[[ "${BACKUP_MINUTE}" =~ ^[0-9]+$ && "${BACKUP_MINUTE}" -le 59 ]] ||
  die "backup minute must be between 0 and 59"
[[ "${BACKUP_HOUR}" =~ ^[0-9]+$ && "${BACKUP_HOUR}" -le 23 ]] ||
  die "backup hour must be between 0 and 23"

command -v docker >/dev/null 2>&1 || die "docker is required"
command -v crontab >/dev/null 2>&1 || die "crontab is required"
command -v install >/dev/null 2>&1 || die "install is required"
command -v env >/dev/null 2>&1 || die "env is required"
getent group docker >/dev/null 2>&1 || die "the Docker group is not available"
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required"

usermod -aG docker "${DEPLOY_USER}"
install -d -o "${DEPLOY_USER}" -g "${DEPLOY_GROUP}" -m 0750 "${RUNTIME_DIR}"
install -d -o "${DEPLOY_USER}" -g "${DEPLOY_GROUP}" -m 0750 "${RUNTIME_DIR}/docker"
install -d -o "${DEPLOY_USER}" -g "${DEPLOY_GROUP}" -m 0700 "${RUNTIME_DIR}/state"
install -d -o "${DEPLOY_USER}" -g "${DEPLOY_GROUP}" -m 0700 "${RUNTIME_DIR}/logs"
install -d -o "${DEPLOY_USER}" -g "${DEPLOY_GROUP}" -m 0700 "${BACKUP_DIR}"

ENV_FILE="${RUNTIME_DIR}/.env.production"
if [[ ! -e "${ENV_FILE}" ]]; then
  install -o "${DEPLOY_USER}" -g "${DEPLOY_GROUP}" -m 0600 /dev/null "${ENV_FILE}"
else
  chown "${DEPLOY_USER}:${DEPLOY_GROUP}" "${ENV_FILE}"
  chmod 0600 "${ENV_FILE}"
fi

BACKUP_LOG="${RUNTIME_DIR}/logs/backup.log"
if [[ ! -e "${BACKUP_LOG}" ]]; then
    install -o "${DEPLOY_USER}" -g "${DEPLOY_GROUP}" -m 0600 /dev/null "${BACKUP_LOG}"
fi

CRON_FILE="/etc/cron.d/japanese-study-hub-backup"
CRON_TEMP="$(mktemp)"
cleanup() {
  rm -f -- "${CRON_TEMP}"
}
trap cleanup EXIT

{
  echo "SHELL=/bin/bash"
  echo "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
  echo "MAILTO="
  printf '%s %s * * * %s RUNTIME_DIR=%s COMPOSE_FILE=%s COMPOSE_ENV_FILE=%s BACKUP_DIR=%s CURRENT_SHA_FILE=%s /bin/bash %s/docker/backup-and-verify.sh >> %s 2>&1\n' \
    "${BACKUP_MINUTE}" \
    "${BACKUP_HOUR}" \
    "${DEPLOY_USER}" \
    "${RUNTIME_DIR}" \
    "${RUNTIME_DIR}/docker-compose.prod.yml" \
    "${ENV_FILE}" \
    "${BACKUP_DIR}" \
    "${RUNTIME_DIR}/state/current_sha" \
    "${RUNTIME_DIR}" \
    "${RUNTIME_DIR}/logs/backup.log"
} >"${CRON_TEMP}"
install -o root -g root -m 0644 "${CRON_TEMP}" "${CRON_FILE}"
trap - EXIT
rm -f -- "${CRON_TEMP}"

echo "Bootstrap completed for ${RUNTIME_DIR}."
echo "The deploy user was added to the docker group; start a new SSH session."
echo "Create/update ${ENV_FILE} with production values before the first deploy."
echo "The daily backup schedule is ${BACKUP_MINUTE} ${BACKUP_HOUR} * * * and becomes effective after the deployment artifacts are synced."
