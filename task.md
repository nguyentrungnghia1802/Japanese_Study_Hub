# Project Task Plan — Japanese Learning System

> Execute tasks in order unless a task explicitly states it may run in parallel.
>
> Do not move past a failed dependency. Follow `Agent.md`.

---

# Phase 0 — Project bootstrap and verification

## TASK-000 — Read and baseline documentation

Requirements: all

- [x] Read all project documentation in required order.
- [x] Record any contradictions before coding.
- [x] Resolve contradictions by source-of-truth priority.
- [x] Confirm V1 scope and explicit non-goals.
- [x] Confirm stack: pnpm + Turborepo + Next.js + Android Native Kotlin/Compose + NestJS + PostgreSQL + Prisma.

Acceptance criteria:

- No unresolved documentation conflict blocks implementation.
- The developer/agent can state the domain boundaries and V1 non-goals.

Commit: documentation-only commit only if corrections were required.

---

## TASK-001 — Create monorepo skeleton

Requirements: Architecture §3

- [x] Initialize Git repository if needed.
- [x] Initialize pnpm workspace.
- [x] Configure Turborepo.
- [x] Create `apps/web`.
- [x] Create `apps/mobile`.
- [x] Create `apps/api`.
- [x] Create `packages/contracts`.
- [x] Create `packages/shared`.
- [x] Create shared tooling/config package(s) as needed.
- [x] Configure root scripts for lint, typecheck, test, build.
- [x] Add `.gitignore`.
- [x] Add `.editorconfig` if used.
- [x] Add safe `.env.example` files.
- [x] Ensure no secret is committed.

Acceptance criteria:

- `pnpm install` succeeds from repository root.
- Workspace scripts discover all apps/packages.
- Repository has clean baseline structure.

Tests/checks:

- [x] Root lint script runs.
- [x] Root typecheck script runs.

Commit: `chore: initialize monorepo workspace`

---

## TASK-002 — Establish code quality tooling

- [x] Configure strict TypeScript.
- [x] Configure ESLint.
- [x] Configure formatting policy/tool.
- [x] Configure test runners.
- [x] Add root CI-friendly scripts.
- [x] Ban accidental committed `.env` secrets.
- [x] Decide supported Node/pnpm versions and document them.

Acceptance criteria:

- Clean generated baseline passes lint/typecheck.
- Deliberate lint/type error causes CI-equivalent command to fail.

Commit: `chore: configure code quality tooling`

---

# Phase 1 — Local infrastructure and API foundation

## TASK-010 — PostgreSQL local environment

Requirements: DATA-004, REL-004

- [x] Add Docker Compose PostgreSQL service.
- [x] Configure persistent local development volume.
- [x] Add healthcheck.
- [x] Add local connection instructions.
- [x] Ensure production secrets are not hard-coded.

Acceptance criteria:

- PostgreSQL starts from a clean machine with documented command.
- API can connect using environment configuration.

Commit: `chore(db): add local PostgreSQL environment`

---

## TASK-011 — NestJS API foundation

- [x] Initialize API app.
- [x] Add global configuration validation.
- [x] Add global validation pipe/schema approach.
- [x] Add consistent error response handling.
- [x] Add structured logger.
- [x] Add request/correlation ID if practical.
- [x] Add `/health` endpoint.
- [x] Add OpenAPI/Swagger generation.
- [x] Add `/api/v1` prefix.

Acceptance criteria:

- API starts with valid config.
- API fails clearly with missing mandatory config.
- `/health` responds.
- OpenAPI is generated.

Tests:

- [x] Health controller/integration test.
- [x] Config validation test.
- [x] Error envelope smoke test.

Commit: `feat(api): establish API foundation`

---

## TASK-012 — Prisma foundation and initial schema

Requirements: `03_DATABASE.md`

- [x] Install/configure Prisma.
- [x] Define initial enums.
- [x] Define flashcard tables.
- [x] Define exam folder tables.
- [x] Define exam/question/option tables.
- [x] Define attempt/best-result tables.
- [x] Add optional import session table if chosen.
- [x] Add timestamps and soft-delete fields.
- [x] Add indexes.
- [x] Create initial migration.
- [x] Add Prisma service/module.

Acceptance criteria:

- Fresh DB can apply all migrations.
- Prisma client generates.
- Schema matches documented cardinalities.

Tests/checks:

- [x] Fresh migration test.
- [x] Basic DB connectivity integration test.

Commit: `feat(db): add initial Prisma schema`

---

# Phase 2 — Authentication

## TASK-020 — Server authentication configuration

Requirements: AUTH-001..AUTH-009

- [x] Add auth module.
- [x] Load configured username and password hash from env.
- [x] Implement secure password verification.
- [x] Implement chosen token/session mechanism.
- [x] Add authentication guard/middleware.
- [x] Add `POST /auth/login`.
- [x] Add `POST /auth/logout`.
- [x] Add `GET /auth/me`.
- [x] Ensure protected routes reject unauthenticated access.
- [x] Add login rate limit.

Acceptance criteria:

- Correct credentials authenticate.
- Incorrect credentials return generic 401.
- Protected endpoint rejects unauthenticated user.
- Secrets are not logged.

Tests:

- [x] Correct login.
- [x] Wrong login.
- [x] Rate limiting.
- [x] Protected route.

Commit: `feat(auth): implement server authentication`

---

## TASK-021 — Web login flow

- [x] Build login page.
- [x] Add API client authentication handling.
- [x] Add protected route/layout behavior.
- [x] Add logout.
- [x] Add loading/error states.
- [x] Ensure auth secret is not in browser bundle.

Acceptance criteria:

- Web user can login/logout.
- Refresh maintains session according to chosen auth design.
- Unauthorized user is redirected to login.

Tests:

- [x] Component/form test as appropriate.
- [x] Web E2E login smoke test.

Commit: `feat(web): add authentication flow`

---

## TASK-022 — Mobile login flow

- [x] Build login screen.
- [x] Add API client.
- [x] Store auth material using secure platform storage where appropriate.
- [x] Add protected navigation.
- [x] Add logout.
- [x] Handle network/auth errors.

Acceptance criteria:

- Mobile login/logout works against backend.
- App restart follows chosen session persistence behavior.

Commit: `feat(mobile): add authentication flow`

---

# Phase 3 — Flashcard backend

## TASK-030 — Flashcard set CRUD API

Requirements: FLASH-SET-001..008

- [x] Create set service/controller/DTOs.
- [x] List with pagination/search/sort.
- [x] Get detail.
- [x] Create.
- [x] Update metadata.
- [x] Soft delete.
- [x] Restore if supported in V1 UI.
- [x] Duplicate set transactionally.
- [x] Exclude soft-deleted records by default.

Acceptance criteria:

- CRUD behavior follows API and DB docs.
- Duplicate copies cards and ordering.

Tests:

- [x] CRUD integration tests.
- [x] Soft delete visibility test.
- [x] Duplicate transaction test.

Commit: `feat(api): implement flashcard set CRUD`

---

## TASK-031 — Flashcard CRUD and ordering API

Requirements: FLASH-001..007

- [x] Create card.
- [x] Edit card.
- [x] Soft delete card.
- [x] Duplicate card.
- [x] Reorder cards.
- [x] Validate set ownership.
- [x] Require non-empty front/back.
- [x] Preserve Japanese Unicode.

Acceptance criteria:

- A card belongs to exactly one set.
- Reordering is stable and transactional where needed.

Tests:

- [x] Create/update/delete.
- [x] Front/back validation.
- [x] Reorder.
- [x] Wrong set ownership rejection.

Commit: `feat(api): implement flashcard card management`

---

## TASK-032 — Flashcard Markdown parser

Requirements: FC-IMPORT-001..012, `05_MARKDOWN_SPEC.md`

- [x] Implement pure parser.
- [x] Extract title, description, cards.
- [x] Enforce `Card <number>` heading requirement.
- [x] Enforce `### Front` and `### Back`.
- [x] Handle multiline content and Japanese unicode.
- [x] Return structured errors/warnings with lines.

Acceptance criteria:

- Parser does not access DB.
- Valid canonical format parses deterministically.
- Invalid input returns actionable errors.

Tests:

- [x] All mandatory flashcard parser cases from testing spec.

Commit: `feat(import): add flashcard Markdown parser`

---

## TASK-033 — Flashcard import preview/confirm

- [x] Add `.md` upload validation.
- [x] Add preview endpoint.
- [x] Add short-lived import token/session or equivalent tamper-safe design.
- [x] Add confirm endpoint.
- [x] Add duplicate policy handling.
- [x] Make confirm transactional.
- [x] Make confirm idempotent/one-time.
- [x] Ensure preview persists no flashcard domain records.

Acceptance criteria:

- Invalid preview cannot be confirmed.
- DB failure leaves no partial set.
- Double confirm does not duplicate data.

Tests:

- [x] Transaction rollback.
- [x] Duplicate confirm.
- [x] Oversized/non-text upload.

Commit: `feat(import): implement flashcard import workflow`

---

## TASK-034 — Flashcard Markdown export

- [x] Generate canonical Markdown.
- [x] Preserve order.
- [x] Include title/description.
- [x] Add export endpoint.
- [x] Set safe filename/content type.

Acceptance criteria:

- Exported file re-imports with equivalent semantic data.

Tests:

- [x] Round-trip test.

Commit: `feat(export): add flashcard Markdown export`

---

# Phase 4 — Flashcard web/mobile UI

## TASK-040 — Web flashcard library

- [x] Flashcard set list.
- [x] Search.
- [x] Sort.
- [x] Create/edit/delete/duplicate actions.
- [x] Empty/loading/error states.
- [x] Set detail/card list.
- [x] Card create/edit/delete/duplicate.
- [x] Reorder UX.

Acceptance criteria:

- Core set/card management can be completed without direct DB/admin tools.

Commit: `feat(web): build flashcard library`

---

## TASK-041 — Web flashcard study mode

Requirements: STUDY-001..008

- [x] Study screen.
- [x] Front/back flip.
- [x] Previous/next.
- [x] Progress indicator.
- [x] Shuffle session.
- [x] Keyboard shortcuts.
- [x] Responsive behavior.

Acceptance criteria:

- User can study a full set without editor UI.

Tests:

- [x] Core interaction component/E2E test.

Commit: `feat(web): add flashcard study mode`

---

## TASK-042 — Web flashcard import/export UI

- [x] Upload `.md`.
- [x] Format guide modal/page.
- [x] Copyable example.
- [x] Preview summary.
- [x] Error/warning list.
- [x] Duplicate policy.
- [x] Confirm import.
- [x] Export action.

Acceptance criteria:

- User can import a valid file without reading backend docs.
- Invalid file clearly identifies problems.

Commit: `feat(web): add flashcard import and export UI`

---

## TASK-043 — Mobile flashcard library and study

- [x] Flashcard set list/search.
- [x] Set detail.
- [x] Basic card management if included in mobile V1.
- [x] Study mode.
- [x] Flip/navigation/shuffle.
- [x] Mobile loading/error states.

Acceptance criteria:

- Mobile user can at minimum discover sets and study them fully.

Commit: `feat(mobile): build flashcard experience`

---

# Phase 5 — Exam backend content management

## TASK-050 — Exam folder service

Requirements: FOLDER-001..008

- [x] CRUD root folders.
- [x] CRUD child folders.
- [x] Move/reorder.
- [x] Calculate/validate depth.
- [x] Reject cycles.
- [x] Reject depth > 2.
- [x] Define non-empty delete behavior.

Acceptance criteria:

- Every hierarchy mutation preserves a valid max-depth-2 tree.

Tests:

- [x] All mandatory folder tests.

Commit: `feat(exams): implement folder hierarchy`

---

## TASK-051 — Exam CRUD and question validation

Requirements: EXAM-001..007, QUESTION-001..009

- [x] Exam list/detail/create/update/delete/duplicate.
- [x] Time limit validation.
- [x] Shuffle settings.
- [x] Question CRUD or atomic content endpoint.
- [x] Type enum.
- [x] Enforce only `MULTIPLE_CHOICE_SINGLE` for V1 creation.
- [x] Enforce 2–6 options.
- [x] Enforce exactly one correct answer.
- [x] Implement content vs metadata edit classification.
- [x] Increment content version for content changes.

Acceptance criteria:

- Invalid exam content cannot be persisted.
- Content mutation and version increment are atomic.

Tests:

- [x] 1/2/6/7 option cases.
- [x] 0/1/2 correct cases.
- [x] Metadata edit version test.
- [x] Content edit version test.

Commit: `feat(exams): implement exam content management`

---

## TASK-052 — Exam Markdown parser

Requirements: EX-IMPORT-001..010

- [x] Parse H1 title.
- [x] Parse time metadata.
- [x] Parse shuffle metadata.
- [x] Parse numbered questions.
- [x] Parse A–F options.
- [x] Parse final answer key.
- [x] Validate exact question/key coverage.
- [x] Validate option count.
- [x] Validate answer option existence.
- [x] Produce line/question diagnostics.
- [x] Enforce limits.

Acceptance criteria:

- Canonical exam file parses deterministically.
- Answer key is required and validated at the end.

Tests:

- [x] All mandatory exam Markdown cases.

Commit: `feat(import): add exam Markdown parser`

---

## TASK-053 — Exam import preview/confirm

- [x] Add preview endpoint.
- [x] Add tamper-safe short-lived import session/token.
- [x] Preview does not persist exam content.
- [x] Confirm validates token/session.
- [x] Confirm creates all exam records in one transaction.
- [x] Add duplicate name policy.
- [x] Prevent duplicate confirm.

Acceptance criteria:

- No partial exam can be created.
- Preview errors block confirmation.

Tests:

- [x] Rollback.
- [x] Duplicate confirm.
- [x] Invalid token.

Commit: `feat(import): implement exam import workflow`

---

## TASK-054 — Exam Markdown export

- [x] Export canonical metadata.
- [x] Export questions/options in order.
- [x] Export final `# ANSWER KEY`.
- [x] Add endpoint.

Acceptance criteria:

- Export/import round trip preserves supported semantics.

Tests:

- [x] Round-trip test.

Commit: `feat(export): add exam Markdown export`

---

# Phase 6 — Exam attempt engine

## TASK-060 — Attempt start and snapshot

Requirements: ATTEMPT-001..008

- [x] Implement attempt creation.
- [x] Snapshot current exam version.
- [x] Record server start time.
- [x] Calculate expiration for timed exam.
- [x] Snapshot stable shuffled question order when enabled.
- [x] Snapshot stable shuffled option order when enabled.
- [x] Return attempt DTO without correctness metadata.
- [x] Add attempt restore endpoint.

Critical acceptance criteria:

- Inspect serialized response: no correct answer information exists.
- Refresh returns same expiration and ordering.

Tests:

- [x] Untimed start.
- [x] Timed start.
- [x] Stable shuffle.
- [x] No answer leakage regression test.

Commit: `feat(exams): implement attempt start and restore`

---

## TASK-061 — In-progress answer persistence

Recommended for refresh resilience.

- [x] Implement answer autosave endpoint or equivalent server persistence.
- [x] Validate question belongs to attempt.
- [x] Validate option belongs to question.
- [x] Allow null/unanswered state.
- [x] Reject updates after submission/expiration policy.

Acceptance criteria:

- Refresh/reopen does not lose server-saved selections.

Tests:

- [x] Valid save.
- [x] Invalid question.
- [x] Invalid option.
- [x] Submitted attempt rejection.

Commit: `feat(exams): persist in-progress answers`

---

## TASK-062 — Server-side submission and scoring

Requirements: SCORE-001..007, ATTEMPT-009..012

- [x] Implement pure scoring service.
- [x] Implement submit endpoint.
- [x] Enforce server expiration.
- [x] Finalize attempt atomically.
- [x] Return graded question results after submission.
- [x] Implement idempotent duplicate submit.
- [x] Calculate duration.
- [x] Apply rounding policy.

Acceptance criteria:

- Server result is authoritative and deterministic.
- Repeated submit returns same finalized result.

Tests:

- [x] Scoring boundary cases.
- [x] Unanswered.
- [x] Timeout.
- [x] Duplicate submit.

Commit: `feat(exams): implement submission and scoring`

---

## TASK-063 — Best-result service

Requirements: RESULT-001..006

- [x] Upsert best result after finalized submission.
- [x] First score creates best.
- [x] Higher score replaces.
- [x] Lower score does not replace.
- [x] Equal score follows tie policy.
- [x] Increment attempt count.
- [x] Scope by exam version.
- [x] Add best-result endpoint.

Acceptance criteria:

- Current exam version displays only applicable best result.

Tests:

- [x] First/higher/lower/equal.
- [x] Version change.

Commit: `feat(exams): implement best-result tracking`

---

# Phase 7 — Exam web UI

## TASK-070 — Web exam library and folder UI

- [x] Folder navigation/tree.
- [x] Maximum-depth UX guard.
- [x] Create/rename/move/delete folder UI.
- [x] Exam list.
- [x] Best score shown under/near exam title/logo.
- [x] Search/sort.
- [x] Empty/loading/error states.

Acceptance criteria:

- User can organize exams without admin/database access.

Commit: `feat(web): build exam library and folders`

---

## TASK-071 — Web exam editor

- [x] Exam metadata form.
- [x] Folder selector.
- [x] Time limit.
- [x] Shuffle toggles.
- [x] Question editor.
- [x] 2–6 option UX.
- [x] Single correct-answer radio selection.
- [x] Reorder questions/options.
- [x] Validation messages.
- [x] Warn/handle score applicability when content changes.

Acceptance criteria:

- Invalid question cannot be saved.
- Editing content causes backend version behavior correctly.

Commit: `feat(web): build exam editor`

---

## TASK-072 — Web exam import/export UI

- [x] `.md` upload.
- [x] Format guide.
- [x] Copyable template.
- [x] Preview metadata/question counts.
- [x] Errors/warnings.
- [x] Confirm import.
- [x] Export action.
- [x] Keep answer key visually de-emphasized in preview.

Acceptance criteria:

- Valid exam can be imported from UI end-to-end.

Commit: `feat(web): add exam import and export UI`

---

## TASK-073 — Web exam pre-start and taking screen

- [x] Pre-start summary.
- [x] Start attempt through backend.
- [x] Render question content/options.
- [x] Previous/next.
- [x] Question navigator.
- [x] Answered/unanswered/current states.
- [x] Autosave selections.
- [x] Render server-based timer.
- [x] Handle refresh/restore.
- [x] Warn near timeout.
- [x] Auto-submit on expiry.

Critical acceptance criteria:

- Refresh does not reset timer.
- Browser DevTools payload does not contain correct answers.

Tests:

- [x] E2E timed attempt flow.

Commit: `feat(web): build exam taking experience`

---

## TASK-074 — Web submission confirmation and result review

- [x] Show answered/unanswered counts.
- [x] Submit confirmation.
- [x] Display score /100.
- [x] Display correct/total.
- [x] Display duration.
- [x] Correct option green.
- [x] Wrong selected option red + correct green.
- [x] Unanswered state + correct green.
- [x] Display updated best score.

Acceptance criteria:

- Result rendering matches scoring response for all answer states.

Commit: `feat(web): add exam result review`

---

# Phase 8 — Mobile exam experience

## TASK-080 — Mobile exam library

- [x] Folder navigation appropriate for mobile.
- [x] Exam list.
- [x] Time/question metadata.
- [x] Best score display.
- [x] Search if included in shared mobile search.

Commit: `feat(mobile): build exam library`

---

## TASK-081 — Mobile exam taking flow

- [x] Pre-start screen.
- [x] Start/restore attempt.
- [x] Question/options UI.
- [x] Navigation.
- [x] Answer persistence.
- [x] Server-based timer.
- [x] Timeout submit handling.
- [x] Submission confirmation.
- [x] Result review colors/icons.
- [x] Best score display.

Acceptance criteria:

- Complete timed exam can be taken on emulator/device.
- App restart/reopen behavior does not grant extra time.

Commit: `feat(mobile): build exam taking flow`

---

# Phase 9 — Search and dashboard

## TASK-090 — Backend search

Requirements: SEARCH-001..006

- [x] Choose documented PostgreSQL search strategy.
- [x] Add necessary indexes/migration.
- [x] Search sets/cards/exams/folders.
- [x] Bound/paginate results.
- [x] Preserve Japanese Unicode behavior.

Tests:

- [x] Japanese search cases.
- [x] Soft-deleted content excluded.

Commit: `feat(search): implement learning content search`

---

## TASK-091 — Web global search

- [x] Search page/input.
- [x] Group results by domain.
- [x] Link results to content.
- [x] Loading/empty/error states.

Commit: `feat(web): add global search`

---

## TASK-092 — Dashboard

Requirements: DASH-001..004

- [x] Quick navigation.
- [x] Recent flashcard sets.
- [x] Recent exams.
- [x] Best scores where available.
- [x] Keep implementation simple.

Commit: `feat(web): add learning dashboard`

---

# Phase 10 — Soft delete, trash, data safety

## TASK-100 — Verify soft-delete consistency

- [x] Review every core query for deleted filtering.
- [x] Review cascade behavior.
- [x] Ensure duplicate/search/export ignore deleted content.
- [x] Add restore endpoints/UI only where selected.
- [x] Ensure non-empty folder delete behavior is explicit.

Tests:

- [x] Deleted resources absent from normal lists/search.
- [x] Restore works where implemented.

Commit: `fix(data): enforce soft-delete consistency`

---

# Phase 11 — Security hardening

## TASK-110 — Markdown rendering sanitization

- [x] Select safe Markdown rendering libraries.
- [x] Sanitize HTML/script vectors on web.
- [x] Apply equivalent safe rendering policy on mobile.
- [x] Add XSS regression tests.

Commit: `security: harden Markdown rendering`

---

## TASK-111 — API security hardening

- [x] Verify auth on protected routes.
- [x] Verify CORS configuration.
- [x] Verify rate limits.
- [x] Verify upload size limits.
- [x] Verify production-safe errors.
- [x] Verify secret-free logs.
- [x] Verify no answer leakage from any live attempt endpoint.
- [x] Verify arbitrary option/question submission rejection.

Acceptance criteria:

- `07_SECURITY.md` release checklist passes locally/staging.

Commit: `security: harden API boundaries`

---

# Phase 12 — Testing completion

## TASK-120 — Unit test completion

- [x] Parser coverage complete.
- [x] Scoring coverage complete.
- [x] Folder depth coverage complete.
- [x] Exam version logic coverage complete.
- [x] Validation coverage complete.

Acceptance criteria:

- All mandatory unit cases in `08_TESTING.md` pass.

Commit: `test: complete domain unit coverage`

---

## TASK-121 — Integration test completion

- [x] Auth integration tests.
- [x] CRUD integration tests.
- [x] Import transaction tests.
- [x] Attempt lifecycle tests.
- [x] Best-result tests.
- [x] Fresh DB migration test.

Commit: `test: complete backend integration coverage`

---

## TASK-122 — Web E2E completion

- [x] Login.
- [x] Flashcard management/study.
- [x] Flashcard import.
- [x] Exam import/create.
- [x] Timed exam.
- [x] Result review.
- [x] Lower-score best result behavior.

Commit: `test(web): complete critical E2E journeys`

---

## TASK-123 — Mobile smoke/E2E completion

- [x] Login.
- [x] Flashcard study.
- [x] Exam list.
- [x] Timed exam.
- [x] Submit/result.

Commit: `test(mobile): complete critical smoke flows`

---

# Phase 13 — Deployment and operations

## TASK-130 — Production build configuration

- [x] Production web build.
- [x] Production API build.
- [x] API container image.
- [x] Web container/platform config.
- [x] Reverse proxy/edge configuration.
- [x] HTTPS plan/config.
- [x] Production env validation.

Acceptance criteria:

- Production-equivalent environment boots successfully.

Commit: `chore(deploy): add production build configuration`

---

## TASK-131 — CI pipeline

- [x] Install with lockfile.
- [x] Lint.
- [x] Typecheck.
- [x] Unit tests.
- [x] Integration tests.
- [x] Build.
- [x] Migration validation.
- [x] Container build if used.

Acceptance criteria:

- Broken lint/test/build causes pipeline failure.

Commit: `ci: add project validation pipeline`

---

## TASK-132 — Backup and restore

Requirements: BACKUP-001..003

- [x] Add documented backup command/job.
- [x] Configure retention.
- [x] Store backup outside live DB volume where feasible.
- [x] Document restore.
- [x] Perform restore into isolated DB.
- [x] Verify application can read restored data.

Acceptance criteria:

- Restore test is actually performed, not only documented.

Commit: `ops: add verified database backup and restore`

---

## TASK-133 — Deployment smoke test

- [x] Health endpoint passes.
- [x] Login works.
- [x] Flashcard CRUD works.
- [x] Flashcard import works.
- [x] Exam start/submit works.
- [x] Timer behavior works.
- [x] Best score works.
- [x] No answer leakage observed.
- [x] Logs contain no secrets.

Commit: only if fixes/config changes were needed.

---

# Phase 14 — Documentation synchronization

## TASK-140 — API documentation sync

- [x] OpenAPI matches implementation.
- [x] Endpoint examples are correct.
- [x] Error codes documented.
- [x] Auth behavior documented.
- [x] Attempt response documented without correctness leakage.

Commit: `docs: synchronize API documentation`

---

## TASK-141 — Developer setup documentation

- [x] Document prerequisites.
- [x] Document install.
- [x] Document local DB start.
- [x] Document migrations.
- [x] Document web/api/mobile start commands.
- [x] Document test commands.
- [x] Document environment variables.

Commit: `docs: finalize developer setup guide`

---

## TASK-142 — Final docs audit

- [x] Requirements match implementation.
- [x] Architecture matches implementation.
- [x] DB doc matches Prisma schema.
- [x] API doc matches routes/OpenAPI.
- [x] Markdown spec matches parsers/exporters.
- [x] UI doc matches shipped flows.
- [x] Security checklist matches configuration.
- [x] Testing doc matches suites.
- [x] Deployment doc matches production method.
- [x] Decisions file reflects all significant deviations.

Commit: `docs: complete final project documentation audit`

---

## TASK-143 — Replace Expo mobile with Android Native Kotlin

- [x] Remove the React Native/Expo implementation, dependencies, and configuration.
- [x] Create a standalone Android Gradle/Kotlin project with Compose and Material 3.
- [x] Add Navigation Compose, ViewModel, Coroutines/Flow, Retrofit/OkHttp, Hilt,
      DataStore, and Android Keystore-backed token storage.
- [x] Preserve the existing Web/API/Database contract and implement auth,
      dashboard, flashcards, exams, search, retry/error states, timer, submit, and result flows.
- [x] Centralize development/production API base URL injection at Android build time.
- [x] Add Android unit tests and CI checks for Gradle tests, lint, debug APK, and
      production-configured APK builds.
- [x] Update workspace configuration, deployment guidance, architecture decisions,
      traceability, README, and release gates.

Acceptance criteria:

- `apps/mobile` is 100% Kotlin Android Native and builds without Node/pnpm.
- Debug unit tests, lint, and debug APK build pass locally and in CI.

Commit: `feat(mobile): migrate to native Android Kotlin`

---

# Phase 15 — Final release gate

## TASK-150 — Full validation

Run from clean checkout/environment where practical:

- [x] `pnpm install` succeeds.
- [x] Lint passes.
- [x] Typecheck passes.
- [x] Unit tests pass.
- [x] Integration tests pass.
- [x] Web E2E critical path passes.
- [x] Mobile smoke path passes.
- [x] Web production build passes.
- [x] API production build passes.
- [x] Mobile Gradle unit tests/lint/debug APK and production-configured APK builds pass.
- [x] Fresh database migration passes.
- [x] Backup restore test has passed.
- [x] Security release checklist passes.
- [x] No critical/high bug remains.
- [x] No mandatory task remains unchecked.

If any item fails:

- [ ] Stop release.
- [ ] Fix root cause.
- [ ] Add regression test when applicable.
- [ ] Re-run affected checks.
- [ ] Re-run full validation.

Acceptance criteria:

- Every item above is green.

Commit: `chore: prepare v1 release`

---

## TASK-151 — Final project completion

- [x] Tag/version the completed V1 release according to chosen versioning policy.
- [x] Record final deployment/version information.
- [x] Confirm `task.md` contains no unchecked mandatory tasks.
- [x] Confirm production service health.
- [x] Confirm most recent backup is valid.

Project may be declared **100% complete for V1** only after TASK-151 is fully satisfied.
