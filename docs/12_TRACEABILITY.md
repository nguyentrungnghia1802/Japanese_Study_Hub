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

## 3. Cross-cutting invariants

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

## 4. Release audit procedure

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
