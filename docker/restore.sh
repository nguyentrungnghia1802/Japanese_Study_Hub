#!/usr/bin/env bash
# Database restore script for Japanese Study Hub (TASK-132)
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path_to_backup_file.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' not found."
  exit 1
fi

echo "Restoring database from ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | docker compose exec -T postgres psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-japanese_learning}"

echo "Database restore completed successfully."
