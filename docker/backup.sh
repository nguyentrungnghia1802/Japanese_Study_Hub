#!/usr/bin/env bash
# Database backup script for Japanese Study Hub (TASK-132)
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/japanese_learning_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "Creating PostgreSQL backup to ${BACKUP_FILE}..."
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-japanese_learning}" | gzip > "${BACKUP_FILE}"

echo "Backup completed successfully: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Retention policy: keep 14 most recent backups
ls -dt "${BACKUP_DIR}"/japanese_learning_*.sql.gz | tail -n +15 | xargs -r rm -f
