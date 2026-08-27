# 12 — Requirement Traceability Matrix

## 1. Purpose

This document maps requirement groups to implementation tasks and verification areas. It is a release-audit aid, not a replacement for the detailed requirement or task documents.

A requirement is considered delivered only when its implementation task and relevant verification task are complete.

---

## 2. Core traceability

| Requirement group | Primary implementation tasks                                            | Primary verification tasks             |
| ----------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| AUTH-*            | TASK-020, TASK-021, TASK-022                                            | TASK-121, TASK-122, TASK-123, TASK-111 |
| FLASH-SET-*       | TASK-030, TASK-040, TASK-043                                            | TASK-121, TASK-122, TASK-123           |
| FLASH-*           | TASK-031, TASK-040, TASK-043                                            | TASK-120, TASK-121, TASK-122           |
| STUDY-*           | TASK-041, TASK-043                                                      | TASK-122, TASK-123                     |
| FC-IMPORT-*       | TASK-032, TASK-033, TASK-042                                            | TASK-120, TASK-121, TASK-122           |
| FC-EXPORT-*       | TASK-034, TASK-042                                                      | TASK-120, TASK-121                     |
| FOLDER-*          | TASK-050, TASK-070, TASK-080                                            | TASK-120, TASK-121, TASK-122           |
| EXAM-*            | TASK-051, TASK-071                                                      | TASK-120, TASK-121, TASK-122           |
| QUESTION-*        | TASK-051, TASK-071                                                      | TASK-120, TASK-121                     |
| CONTEXT-*         | Architecture/schema preparation in TASK-012/TASK-051                    | TASK-142 review                        |
| EX-IMPORT-*       | TASK-052, TASK-053, TASK-072                                            | TASK-120, TASK-121, TASK-122           |
| EX-EXPORT-*       | TASK-054, TASK-072                                                      | TASK-120, TASK-121                     |
| ATTEMPT-*         | TASK-060, TASK-061, TASK-062, TASK-073, TASK-081                        | TASK-120, TASK-121, TASK-122, TASK-123 |
| SCORE-*           | TASK-062, TASK-074, TASK-081                                            | TASK-120, TASK-121, TASK-122           |
| RESULT-*          | TASK-063, TASK-070, TASK-074, TASK-080, TASK-081                        | TASK-120, TASK-121, TASK-122, TASK-123 |
| SEARCH-*          | TASK-090, TASK-091                                                      | TASK-121, TASK-122                     |
| SORT-*            | TASK-030, TASK-040, TASK-070                                            | TASK-121, TASK-122                     |
| DASH-*            | TASK-092                                                                | TASK-122                               |
| DATA-*            | TASK-012, TASK-100, TASK-132                                            | TASK-121, TASK-150                     |
| MEDIA-*           | TASK-012 and feature-specific implementation if cover upload is enabled | TASK-111, TASK-142                     |
| VAL-*             | TASK-011 plus every write-domain task                                   | TASK-120, TASK-121                     |
| ERR-*             | TASK-011 plus every API task                                            | TASK-111, TASK-121                     |
| PERF-*            | TASK-012, TASK-030, TASK-051, TASK-090                                  | TASK-142, TASK-150                     |
| REL-*             | TASK-012, TASK-033, TASK-053, TASK-062, TASK-063                        | TASK-121, TASK-150                     |
| COMPAT-*          | TASK-001, TASK-040..043, TASK-070..081                                  | TASK-122, TASK-123, TASK-150           |
| UX-*              | TASK-021, TASK-040..043, TASK-070..081, TASK-091, TASK-092              | TASK-122, TASK-123                     |
| OBS-*             | TASK-011, TASK-111, TASK-130                                            | TASK-133, TASK-150                     |
| BACKUP-*          | TASK-132                                                                | TASK-150, TASK-151                     |

---

## 3.1 Android Native migration verification

| Mobile area                    | Android implementation                                          | Verification                                                                                           |
| ------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Authentication and persistence | `feature/auth`, Keystore-encrypted DataStore, `StudyRepository` | `AuthViewModelTest`, API error mapping test                                                            |
| Flashcard study                | `feature/flashcards`, `StudyViewModel`, Compose navigation      | `StudySessionLogicTest`, `testDebugUnitTest`, emulator smoke path                                      |
| Exam timer and submit          | `feature/exams`, server `expiresAt`, active-attempt DataStore   | `ExamSessionLogicTest`, emulator timed-exam smoke path                                                 |
| API configuration              | Gradle `BuildConfig.API_BASE_URL`                               | debug/production/release Gradle configuration verification                                             |
| Android quality gate           | Gradle wrapper                                                  | `testDebugUnitTest`, `lintDebug`, `assembleDebug`, `assembleProduction`, and `verifyApiBaseUrls` in CI |

## 4. Cross-cutting invariants

The following invariants must have direct regression tests and must be manually audited before release:

| Invariant                                                | Implementation     | Verification                           |
| -------------------------------------------------------- | ------------------ | -------------------------------------- |
| Live exam payload contains no correct-answer information | TASK-060           | TASK-111, TASK-121, TASK-122, TASK-133 |
| Server time controls exam expiration                     | TASK-060, TASK-062 | TASK-121, TASK-122, TASK-123           |
| Exam submit is idempotent                                | TASK-062           | TASK-121                               |
| Import preview creates no domain data                    | TASK-033, TASK-053 | TASK-121                               |
| Import confirmation is transactional                     | TASK-033, TASK-053 | TASK-121                               |
| Import confirmation cannot be consumed twice             | TASK-033, TASK-053 | TASK-121                               |
| Folder depth never exceeds 2                             | TASK-050           | TASK-120, TASK-121                     |
| Multiple-choice question has 2–6 options                 | TASK-051           | TASK-120, TASK-121                     |
| Exactly one correct option                               | TASK-051           | TASK-120, TASK-121                     |
| Lower score never replaces higher best score             | TASK-063           | TASK-121, TASK-122                     |
| Exam content change invalidates old best applicability   | TASK-051, TASK-063 | TASK-120, TASK-121                     |
| Markdown rendered content is sanitized                   | TASK-110           | TASK-111, TASK-122                     |
| Deleted content is excluded from normal search/list      | TASK-100           | TASK-121                               |
| Fresh DB can apply all migrations                        | TASK-012           | TASK-121, TASK-150                     |
| Backup can actually be restored                          | TASK-132           | TASK-150, TASK-151                     |

---

## 5. Release audit procedure

Before TASK-150 is marked complete:

1. Review every requirement prefix in `01_REQUIREMENTS.md`.
2. Confirm its mapped implementation task is checked.
3. Confirm its mapped verification task is checked.
4. Search for TODO/FIXME/skipped tests in critical paths.
5. Compare Prisma schema with `03_DATABASE.md`.
6. Compare generated OpenAPI with `04_API.md`.
7. Compare parser/export fixtures with `05_MARKDOWN_SPEC.md`.
8. Check UI behavior against `06_UI_UX.md`.
9. Complete the security checklist in `07_SECURITY.md`.
10. Complete all mandatory tests in `08_TESTING.md`.
11. Verify deployment/backup procedures from `09_DEPLOYMENT.md`.

Any uncovered requirement or mismatch reopens the relevant task; do not waive it silently.

## 6. Phase 2 traceability

Each Phase 2 requirement group has an implementation task and an independent
verification task or evidence record. `TASK-320` is the final aggregate gate; it
does not make an earlier task complete by itself.

| Phase 2 requirement group                    | Implementation tasks                   | Verification tasks/evidence                                                                               |
| -------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| P2-PERF-BASELINE                             | TASK-201                               | TASK-301; `docs/performance/phase2-baseline.md`                                                           |
| P2-CACHE-001 bounded Web query cache         | TASK-202, TASK-210..213, TASK-217      | TASK-300, TASK-301; cache policy and query-client tests                                                   |
| P2-CACHE-002 explicit invalidation           | TASK-210..213, TASK-215..217           | TASK-300; query invalidation tests                                                                        |
| P2-CACHE-003 fresh live attempts             | TASK-214                               | TASK-300, TASK-303, TASK-320; live-attempt policy tests and Web journey                                   |
| P2-CACHE-004 minimal browser storage         | TASK-220, TASK-222                     | TASK-300, TASK-303, TASK-320; session/preference audits                                                   |
| P2-CACHE-005 conditional transport caching   | TASK-230                               | TASK-293, TASK-301, TASK-320; `docs/performance/http-cache-policy.md` and 304 smoke evidence              |
| P2-PERF-HTTP                                 | TASK-231                               | TASK-301, TASK-320; `docs/performance/http-transport.md`                                                  |
| P2-PERF-API                                  | TASK-232, TASK-233, TASK-234, TASK-235 | TASK-301, TASK-302, TASK-303; payload/query/bundle/virtualization audits                                  |
| P2-SESSION and cookie decision               | TASK-220..222                          | TASK-300, TASK-320; `docs/security/web-auth-session-audit.md`                                             |
| P2-LEARN-RECENT                              | TASK-240                               | TASK-302, TASK-303, TASK-304; `docs/learning/recent-resume.md`                                            |
| P2-LEARN-FAVORITES                           | TASK-241                               | TASK-302, TASK-303, TASK-304; `docs/learning/favorites.md`                                                |
| P2-LEARN-TAGS                                | TASK-242                               | TASK-302, TASK-303, TASK-304; `docs/learning/tags.md`                                                     |
| P2-FSRS-001 server-authoritative scheduler   | TASK-250, TASK-251                     | TASK-302, TASK-303, TASK-304, TASK-320; FSRS unit/integration/journey evidence                            |
| P2-FSRS-002 bounded review state/idempotency | TASK-250, TASK-251                     | TASK-302, TASK-303, TASK-304, TASK-320; review-log and retry tests                                        |
| P2-FSRS-003 Web/Android review modes         | TASK-252, TASK-253                     | TASK-303, TASK-304, TASK-320; Web and emulator evidence                                                   |
| P2-FSRS-004 UTC/timezone boundary            | TASK-250, TASK-251                     | TASK-302, TASK-320; scheduler boundary tests and `docs/learning/fsrs-scheduling.md`                       |
| P2-EXAM-REVIEW-001 mistake queue/integrity   | TASK-260                               | TASK-302, TASK-303, TASK-304; sanitization/version/deletion tests                                         |
| P2-EXAM-REVIEW-002 isolated practice         | TASK-261                               | TASK-302, TASK-303, TASK-304; best/mistake isolation tests                                                |
| P2-ANDROID-CACHE                             | TASK-270, TASK-271                     | TASK-302, TASK-304, TASK-320; Room unit tests and emulator offline/reconnect evidence                     |
| P2-SEARCH-RESPONSIVE                         | TASK-280                               | TASK-300, TASK-302, TASK-303, TASK-304; Unicode/ranking/cancellation/bound tests                          |
| P2-IMPORT-MULTI                              | TASK-281                               | TASK-302, TASK-303; bounded sequential preview/confirm tests and Web journey                              |
| P2-OPS-TRANSPORT                             | TASK-290                               | TASK-293, TASK-320; `docs/security/production-transport-audit.md`                                         |
| P2-OPS-UPDATE                                | TASK-291                               | TASK-301, TASK-320; Compose/script syntax and guarded workflow checks                                     |
| P2-OPS-BACKUP                                | TASK-292                               | TASK-302, TASK-320; `docs/operations/backup-restore-2026-08-27.md` plus owner scheduler/artifact evidence |
| P2-OPS-OBS                                   | TASK-293                               | TASK-302, TASK-320; observability unit tests and safe-log review                                          |

### Phase 2 invariants

| Invariant                                                                                     | Implementation               | Verification                                                         |
| --------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------- |
| PostgreSQL/API remain the only authoritative content store                                    | TASK-200, TASK-202, TASK-270 | TASK-302, TASK-304, TASK-320                                         |
| Web cache is memory-only, stale/GC bounded, and search-key bounded                            | TASK-202, TASK-210..217      | TASK-300, TASK-301, TASK-320                                         |
| Mutations invalidate only affected query families                                             | TASK-210..217                | TASK-300                                                             |
| Live attempts are freshness-first and never cached with answers                               | TASK-214                     | TASK-300, TASK-303, TASK-320                                         |
| Bearer auth remains compatible while cookie migration is deferred                             | TASK-220..222                | TASK-300, TASK-303, TASK-320                                         |
| Cookies/storage contain no learning content, answer keys, or secrets                          | TASK-220..222                | TASK-300, TASK-303, TASK-320                                         |
| Authenticated HTTP responses are private/revalidated; auth/live/export/mutations are no-store | TASK-230                     | TASK-293, TASK-301, TASK-320                                         |
| Current transport documentation matches the IP-only HTTP runtime                              | TASK-290                     | TASK-320; transport audit                                            |
| Live exam payload contains no correct-answer information                                      | TASK-060, TASK-214, TASK-260 | TASK-121, TASK-122, TASK-302, TASK-303, TASK-304, TASK-320           |
| Server time controls exam expiration and submit is idempotent                                 | TASK-060, TASK-062           | TASK-121, TASK-122, TASK-123, TASK-302, TASK-303, TASK-304, TASK-320 |
| FSRS transitions are deterministic, server-UTC, bounded, and idempotent                       | TASK-250..253                | TASK-302, TASK-303, TASK-304, TASK-320                               |
| Practice review cannot update official best result or mistake history                         | TASK-260..261                | TASK-302, TASK-303, TASK-304, TASK-320                               |
| Android Room has 100-row/seven-day bounds, stale state, and no answer keys or mutation queue  | TASK-270..271                | TASK-302, TASK-304, TASK-320                                         |
| Tags stay flat, normalized, and bounded                                                       | TASK-242                     | TASK-302, TASK-303, TASK-304                                         |
| Mistake queue contains only submitted/current-version prompts                                 | TASK-260                     | TASK-302, TASK-303, TASK-304                                         |
| Search preserves Unicode, ranking, cancellation, and cache bounds                             | TASK-280                     | TASK-300, TASK-302, TASK-303, TASK-304                               |
| Multi-file import preserves preview/confirm isolation                                         | TASK-281                     | TASK-302, TASK-303                                                   |
| Phase 2 schema and data restore from a verified backup                                        | TASK-292                     | TASK-302, TASK-320                                                   |
| Observability never logs credentials, tokens, bodies, imported content, or answer keys        | TASK-293                     | TASK-302, TASK-320                                                   |

### Phase 2 release audit

Before TASK-320 is checked, perform this audit in order:

1. Confirm the checkout and branch, preserve unrelated work, and ensure the
   unapproved Phase 3 work is not staged before the Phase 2 release.
2. Review every requirement row above and the corresponding `tasks/task-01.md` section;
   an unchecked mandatory implementation or verification item reopens its task.
3. Search critical paths for TODO/FIXME/skipped tests and investigate every hit;
   no placeholder may stand in for implementation.
4. Run the root install, lint, typecheck, unit, integration, Web E2E/build,
   response-size/bundle, API build, migration, and Android gates listed in
   `tasks/task-01.md` and `docs/08_TESTING.md`.
5. Inspect cache/storage behavior: query stale/GC and search-key limits,
   targeted invalidation, no content persistence, minimal auth storage, live
   attempt freshness, Room row/age cleanup, and no correctness metadata.
6. Inspect integrity behavior: sanitized live attempts, server expiration,
   idempotent submit/review/import confirmation, current-version mistakes, and
   practice isolation.
7. Compare Prisma schema/migration count, API routes/headers, security strategy,
   deployment script, backup restore evidence, and observability output with the
   technical documents.
8. Separate local evidence from owner-controlled release gates. The current
   production HTTPS upgrade, daily remote backup scheduler/off-volume artifact,
   and physical production Android/signing validation must not be inferred from
   local substitutes.
9. Only after all mandatory rows are green update TASK-320 and create the
   release record required by TASK-321. If a gate fails, stop, fix the root
   cause, add regression coverage where applicable, and repeat the full audit.
