# Phase 2 integration and migration verification

Date: 2026-08-27
Scope: TASK-302

## Environment

- PostgreSQL 16.8 on the local host.
- The repository .env connection was used with the local PostgreSQL port
  (localhost:5432).
- Integration tests are opt-in and run with RUN_API_INTEGRATION=1.
- Test data uses unique timestamped names and is deleted in the test teardown.

## API integration coverage

Command:

```powershell
$env:DATABASE_URL = ((Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', '') -replace 'localhost:5433', 'localhost:5432'
$env:RUN_API_INTEGRATION = '1'
pnpm --filter @japanese-learning/api test:integration
```

Result: apps/api/test/phase2.integration.spec.ts passed with 2 tests.

The tests cover:

- favorite and normalized tag filtering for flashcard sets and exams;
- recent-learning touch/list behavior;
- FSRS review transition and duplicate clientRequestId replay, with one
  persisted review log;
- official wrong-answer persistence and sanitized mistake responses;
- practice-mode answer sanitization and isolation from official best results.

## Migration coverage

The repeatable harness is
scripts/verify-phase2-migrations.ps1. It creates two uniquely named
temporary databases and always removes them in finally:

```powershell
$env:DATABASE_URL = ((Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', '') -replace 'localhost:5433', 'localhost:5432'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-phase2-migrations.ps1
```

Result on 2026-08-27:

- Fresh database: all 7 repository migrations applied successfully.
- V1 upgrade: the 20260826000000_init migration was applied first, then the
  six Phase 2 migrations were deployed successfully.
- Both databases contained the Phase 2 tables
  (recent_learning, tags, tag join tables, flashcard_review_logs, and
  exam_mistakes) and the Phase 2 columns checked by the harness.
- Temporary databases and the temporary migration copy were removed after the
  check.

This is local migration-chain evidence; it does not substitute for a
production migration run or production backup ownership verification.
