# Phase 2 release record

Release: `v2.0.0`
Release date: 2026-08-27
Release commit: tagged commit containing this record

## Source and images

- Git source: `95426d4cbc90925f07a01f702fe784ed00a57dd8`
- API image: `ghcr.io/nguyentrungnghia1802/japanese-study-hub-api:95426d4cbc90925f07a01f702fe784ed00a57dd8`
- Web image: `ghcr.io/nguyentrungnghia1802/japanese-study-hub-web:95426d4cbc90925f07a01f702fe784ed00a57dd8`
- Floating deployment tag: `latest`, published by the same workflow.
- GitHub CI and Docker publish workflows passed for the source commit.

## Production verification

The owner confirmed that the guarded production update completed. A read-only
probe from the development host on 2026-08-27 returned:

| Check                                      | Result                  |
| ------------------------------------------ | ----------------------- |
| `http://157.173.127.217:4000/health`       | HTTP 200                |
| `http://157.173.127.217:4000/health/ready` | HTTP 200; database `ok` |
| `http://157.173.127.217:3000/`             | HTTP 200                |

The deployment remains IP-only HTTP. HTTPS is an explicitly documented,
owner-accepted follow-up boundary; this release does not claim HTTPS or Secure
cookie production support.

## Android and backup verification

- Android production build metadata: `versionCode 1`, `versionName 1.0.0`.
- The owner confirmed production Android connection and install/signing
  validation on 2026-08-27. The signed APK and physical-device evidence remain
  outside the repository.
- The owner confirmed the production daily backup schedule, off-volume artifact,
  and a successful Phase 2 production-origin restore on 2026-08-27. Server logs,
  backup files, and restore output remain outside the repository.
- Local PostgreSQL 16 backup/restore evidence is recorded in
  `docs/operations/backup-restore-2026-08-27.md`.

## Gate result

All Phase 2 task checklist items, including TASK-320 and TASK-321, are recorded
as complete in the archived plan `docs/releases/PHASE2_TASKS.md`. The plan was
archived before the active task file was advanced to Phase 3.
