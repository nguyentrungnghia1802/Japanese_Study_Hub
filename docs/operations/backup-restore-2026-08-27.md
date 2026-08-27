# Phase 2 backup and restore verification - 2026-08-27

## Result

The Phase 2 schema and current local PostgreSQL data were exported as a
compressed plain-SQL backup and restored into a fresh isolated PostgreSQL 16
database on 2026-08-27. Temporary restore data was removed after verification.

The restore reported:

- flashcards=28
- review_logs=4
- exam_mistakes=0
- recent_learning=4
- tags=0
- migrations=7
- exam_attempts.is_practice present

This demonstrates that the Phase 2 tables, rows, migration history, and
practice-mode column are restorable from the backup format used by
docker/backup.sh. A disposable Docker verification command is available as
bash docker/verify-backup-restore.sh backup.sql.gz on a VPS with Docker.

## Backup policy

docker/backup.sh writes atomically to BACKUP_DIR, keeps 14 timestamped files,
and refuses a path inside the inspected PostgreSQL named volume. Set BACKUP_DIR
to a host path such as /srv/japanese-study-hub/backups, outside postgres_data.
The repository production policy does not commit backups.

A VPS scheduler can run the script daily with an owner-controlled cron entry,
for example at 02:17 after the operator reviews the environment file. The
owner confirmed on 2026-08-27 that the production scheduler is active and that
the current backup is stored outside the live PostgreSQL volume.

## External verification boundary

The development workspace has no SSH, cron, or VPS scheduler access. The owner
also confirmed on 2026-08-27 that a production-origin backup restore completed
successfully after the Phase 2 migration. The actual scheduler log, off-host
backup file, and restore output remain outside this checkout and are not copied
or recreated here.
