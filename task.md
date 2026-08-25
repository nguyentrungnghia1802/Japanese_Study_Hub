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
- [x] Confirm stack: pnpm + Turborepo + Next.js + Expo + NestJS + PostgreSQL + Prisma.

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

- [ ] Build login screen.
- [ ] Add API client.
- [ ] Store auth material using secure platform storage where appropriate.
- [ ] Add protected navigation.
- [ ] Add logout.
- [ ] Handle network/auth errors.

Acceptance criteria:

- Mobile login/logout works against backend.
- App restart follows chosen session persistence behavior.

Commit: `feat(mobile): add authentication flow`

---

# Phase 3 — Flashcard backend

## TASK-030 — Flashcard set CRUD API

Requirements: FLASH-SET-001..008

- [ ] Create set service/controller/DTOs.
- [ ] List with pagination/search/sort.
- [ ] Get detail.
- [ ] Create.
- [ ] Update metadata.
- [ ] Soft delete.
- [ ] Restore if supported in V1 UI.
- [ ] Duplicate set transactionally.
- [ ] Exclude soft-deleted records by default.

Acceptance criteria:

- CRUD behavior follows API and DB docs.
- Duplicate copies cards and ordering.

Tests:

- [ ] CRUD integration tests.
- [ ] Soft delete visibility test.
- [ ] Duplicate transaction test.

Commit: `feat(api): implement flashcard set CRUD`

---

## TASK-031 — Flashcard CRUD and ordering API

Requirements: FLASH-001..007

- [ ] Create card.
- [ ] Edit card.
- [ ] Soft delete card.
- [ ] Duplicate card.
- [ ] Reorder cards.
- [ ] Validate set ownership.
- [ ] Require non-empty front/back.
- [ ] Preserve Japanese Unicode.

Acceptance criteria:

- A card belongs to exactly one set.
- Reordering is stable and transactional where needed.

Tests:

- [ ] Create/update/delete.
- [ ] Front/back validation.
- [ ] Reorder.
- [ ] Wrong set ownership rejection.

Commit: `feat(api): implement flashcard card management`

---

## TASK-032 — Flashcard Markdown parser

Requirements: FC-IMPORT-001..012, `05_MARKDOWN_SPEC.md`

- [ ] Implement pure parser.
- [ ] Parse title/description/cards.
- [ ] Track line/card diagnostics where practical.
- [ ] Validate required structural headings.
- [ ] Ignore structural markers inside fenced code blocks.
- [ ] Reject empty front/back.
- [ ] Enforce configurable limits.
- [ ] Produce normalized DTO + warnings/errors.

Acceptance criteria:

- Parser does not access DB.
- Valid canonical format parses deterministically.
- Invalid input returns actionable errors.

Tests:

- [ ] All mandatory flashcard parser cases from testing spec.

Commit: `feat(import): add flashcard Markdown parser`

---

## TASK-033 — Flashcard import preview/confirm

- [ ] Add `.md` upload validation.
- [ ] Add preview endpoint.
- [ ] Add short-lived import token/session or equivalent tamper-safe design.
- [ ] Add confirm endpoint.
- [ ] Add duplicate policy handling.
- [ ] Make confirm transactional.
- [ ] Make confirm idempotent/one-time.
- [ ] Ensure preview persists no flashcard domain records.

Acceptance criteria:

- Invalid preview cannot be confirmed.
- DB failure leaves no partial set.
- Double confirm does not duplicate data.

Tests:

- [ ] Transaction rollback.
- [ ] Duplicate confirm.
- [ ] Oversized/non-text upload.

Commit: `feat(import): implement flashcard import workflow`

---

## TASK-034 — Flashcard Markdown export

- [ ] Generate canonical Markdown.
- [ ] Preserve order.
- [ ] Include title/description.
- [ ] Add export endpoint.
- [ ] Set safe filename/content type.

Acceptance criteria:

- Exported file re-imports with equivalent semantic data.

Tests:

- [ ] Round-trip test.

Commit: `feat(export): add flashcard Markdown export`

---

# Phase 4 — Flashcard web/mobile UI

## TASK-040 — Web flashcard library

- [ ] Flashcard set list.
- [ ] Search.
- [ ] Sort.
- [ ] Create/edit/delete/duplicate actions.
- [ ] Empty/loading/error states.
- [ ] Set detail/card list.
- [ ] Card create/edit/delete/duplicate.
- [ ] Reorder UX.

Acceptance criteria:

- Core set/card management can be completed without direct DB/admin tools.

Commit: `feat(web): build flashcard library`

---

## TASK-041 — Web flashcard study mode

Requirements: STUDY-001..008

- [ ] Study screen.
- [ ] Front/back flip.
- [ ] Previous/next.
- [ ] Progress indicator.
- [ ] Shuffle session.
- [ ] Keyboard shortcuts.
- [ ] Responsive behavior.

Acceptance criteria:

- User can study a full set without editor UI.

Tests:

- [ ] Core interaction component/E2E test.

Commit: `feat(web): add flashcard study mode`

---

## TASK-042 — Web flashcard import/export UI

- [ ] Upload `.md`.
- [ ] Format guide modal/page.
- [ ] Copyable example.
- [ ] Preview summary.
- [ ] Error/warning list.
- [ ] Duplicate policy.
- [ ] Confirm import.
- [ ] Export action.

Acceptance criteria:

- User can import a valid file without reading backend docs.
- Invalid file clearly identifies problems.

Commit: `feat(web): add flashcard import and export UI`

---

## TASK-043 — Mobile flashcard library and study

- [ ] Flashcard set list/search.
- [ ] Set detail.
- [ ] Basic card management if included in mobile V1.
- [ ] Study mode.
- [ ] Flip/navigation/shuffle.
- [ ] Mobile loading/error states.

Acceptance criteria:

- Mobile user can at minimum discover sets and study them fully.

Commit: `feat(mobile): build flashcard experience`

---

# Phase 5 — Exam backend content management

## TASK-050 — Exam folder service

Requirements: FOLDER-001..008

- [ ] CRUD root folders.
- [ ] CRUD child folders.
- [ ] Move/reorder.
- [ ] Calculate/validate depth.
- [ ] Reject cycles.
- [ ] Reject depth > 2.
- [ ] Define non-empty delete behavior.

Acceptance criteria:

- Every hierarchy mutation preserves a valid max-depth-2 tree.

Tests:

- [ ] All mandatory folder tests.

Commit: `feat(exams): implement folder hierarchy`

---

## TASK-051 — Exam CRUD and question validation

Requirements: EXAM-001..007, QUESTION-001..009

- [ ] Exam list/detail/create/update/delete/duplicate.
- [ ] Time limit validation.
- [ ] Shuffle settings.
- [ ] Question CRUD or atomic content endpoint.
- [ ] Type enum.
- [ ] Enforce only `MULTIPLE_CHOICE_SINGLE` for V1 creation.
- [ ] Enforce 2–6 options.
- [ ] Enforce exactly one correct answer.
- [ ] Implement content vs metadata edit classification.
- [ ] Increment content version for content changes.

Acceptance criteria:

- Invalid exam content cannot be persisted.
- Content mutation and version increment are atomic.

Tests:

- [ ] 1/2/6/7 option cases.
- [ ] 0/1/2 correct cases.
- [ ] Metadata edit version test.
- [ ] Content edit version test.

Commit: `feat(exams): implement exam content management`

---

## TASK-052 — Exam Markdown parser

Requirements: EX-IMPORT-001..010

- [ ] Parse H1 title.
- [ ] Parse time metadata.
- [ ] Parse shuffle metadata.
- [ ] Parse numbered questions.
- [ ] Parse A–F options.
- [ ] Parse final answer key.
- [ ] Validate exact question/key coverage.
- [ ] Validate option count.
- [ ] Validate answer option existence.
- [ ] Produce line/question diagnostics.
- [ ] Enforce limits.

Acceptance criteria:

- Canonical exam file parses deterministically.
- Answer key is required and validated at the end.

Tests:

- [ ] All mandatory exam Markdown cases.

Commit: `feat(import): add exam Markdown parser`

---

## TASK-053 — Exam import preview/confirm

- [ ] Add preview endpoint.
- [ ] Add tamper-safe short-lived import session/token.
- [ ] Preview does not persist exam content.
- [ ] Confirm validates token/session.
- [ ] Confirm creates all exam records in one transaction.
- [ ] Add duplicate name policy.
- [ ] Prevent duplicate confirm.

Acceptance criteria:

- No partial exam can be created.
- Preview errors block confirmation.

Tests:

- [ ] Rollback.
- [ ] Duplicate confirm.
- [ ] Invalid token.

Commit: `feat(import): implement exam import workflow`

---

## TASK-054 — Exam Markdown export

- [ ] Export canonical metadata.
- [ ] Export questions/options in order.
- [ ] Export final `# ANSWER KEY`.
- [ ] Add endpoint.

Acceptance criteria:

- Export/import round trip preserves supported semantics.

Tests:

- [ ] Round-trip test.

Commit: `feat(export): add exam Markdown export`

---

# Phase 6 — Exam attempt engine

## TASK-060 — Attempt start and snapshot

Requirements: ATTEMPT-001..008

- [ ] Implement attempt creation.
- [ ] Snapshot current exam version.
- [ ] Record server start time.
- [ ] Calculate expiration for timed exam.
- [ ] Snapshot stable shuffled question order when enabled.
- [ ] Snapshot stable shuffled option order when enabled.
- [ ] Return attempt DTO without correctness metadata.
- [ ] Add attempt restore endpoint.

Critical acceptance criteria:

- Inspect serialized response: no correct answer information exists.
- Refresh returns same expiration and ordering.

Tests:

- [ ] Untimed start.
- [ ] Timed start.
- [ ] Stable shuffle.
- [ ] No answer leakage regression test.

Commit: `feat(exams): implement attempt start and restore`

---

## TASK-061 — In-progress answer persistence

Recommended for refresh resilience.

- [ ] Implement answer autosave endpoint or equivalent server persistence.
- [ ] Validate question belongs to attempt.
- [ ] Validate option belongs to question.
- [ ] Allow null/unanswered state.
- [ ] Reject updates after submission/expiration policy.

Acceptance criteria:

- Refresh/reopen does not lose server-saved selections.

Tests:

- [ ] Valid save.
- [ ] Invalid question.
- [ ] Invalid option.
- [ ] Submitted attempt rejection.

Commit: `feat(exams): persist in-progress answers`

---

## TASK-062 — Server-side submission and scoring

Requirements: SCORE-001..007, ATTEMPT-009..012

- [ ] Implement pure scoring service.
- [ ] Implement submit endpoint.
- [ ] Enforce server expiration.
- [ ] Finalize attempt atomically.
- [ ] Return graded question results after submission.
- [ ] Implement idempotent duplicate submit.
- [ ] Calculate duration.
- [ ] Apply rounding policy.

Acceptance criteria:

- Server result is authoritative and deterministic.
- Repeated submit returns same finalized result.

Tests:

- [ ] Scoring boundary cases.
- [ ] Unanswered.
- [ ] Timeout.
- [ ] Duplicate submit.

Commit: `feat(exams): implement submission and scoring`

---

## TASK-063 — Best-result service

Requirements: RESULT-001..006

- [ ] Upsert best result after finalized submission.
- [ ] First score creates best.
- [ ] Higher score replaces.
- [ ] Lower score does not replace.
- [ ] Equal score follows tie policy.
- [ ] Increment attempt count.
- [ ] Scope by exam version.
- [ ] Add best-result endpoint.

Acceptance criteria:

- Current exam version displays only applicable best result.

Tests:

- [ ] First/higher/lower/equal.
- [ ] Version change.

Commit: `feat(exams): implement best-result tracking`

---

# Phase 7 — Exam web UI

## TASK-070 — Web exam library and folder UI

- [ ] Folder navigation/tree.
- [ ] Maximum-depth UX guard.
- [ ] Create/rename/move/delete folder UI.
- [ ] Exam list.
- [ ] Best score shown under/near exam title/logo.
- [ ] Search/sort.
- [ ] Empty/loading/error states.

Acceptance criteria:

- User can organize exams without admin/database access.

Commit: `feat(web): build exam library and folders`

---

## TASK-071 — Web exam editor

- [ ] Exam metadata form.
- [ ] Folder selector.
- [ ] Time limit.
- [ ] Shuffle toggles.
- [ ] Question editor.
- [ ] 2–6 option UX.
- [ ] Single correct-answer radio selection.
- [ ] Reorder questions/options.
- [ ] Validation messages.
- [ ] Warn/handle score applicability when content changes.

Acceptance criteria:

- Invalid question cannot be saved.
- Editing content causes backend version behavior correctly.

Commit: `feat(web): build exam editor`

---

## TASK-072 — Web exam import/export UI

- [ ] `.md` upload.
- [ ] Format guide.
- [ ] Copyable template.
- [ ] Preview metadata/question counts.
- [ ] Errors/warnings.
- [ ] Confirm import.
- [ ] Export action.
- [ ] Keep answer key visually de-emphasized in preview.

Acceptance criteria:

- Valid exam can be imported from UI end-to-end.

Commit: `feat(web): add exam import and export UI`

---

## TASK-073 — Web exam pre-start and taking screen

- [ ] Pre-start summary.
- [ ] Start attempt through backend.
- [ ] Render question content/options.
- [ ] Previous/next.
- [ ] Question navigator.
- [ ] Answered/unanswered/current states.
- [ ] Autosave selections.
- [ ] Render server-based timer.
- [ ] Handle refresh/restore.
- [ ] Warn near timeout.
- [ ] Auto-submit on expiry.

Critical acceptance criteria:

- Refresh does not reset timer.
- Browser DevTools payload does not contain correct answers.

Tests:

- [ ] E2E timed attempt flow.

Commit: `feat(web): build exam taking experience`

---

## TASK-074 — Web submission confirmation and result review

- [ ] Show answered/unanswered counts.
- [ ] Submit confirmation.
- [ ] Display score /100.
- [ ] Display correct/total.
- [ ] Display duration.
- [ ] Correct option green.
- [ ] Wrong selected option red + correct green.
- [ ] Unanswered state + correct green.
- [ ] Display updated best score.

Acceptance criteria:

- Result rendering matches scoring response for all answer states.

Commit: `feat(web): add exam result review`

---

# Phase 8 — Mobile exam experience

## TASK-080 — Mobile exam library

- [ ] Folder navigation appropriate for mobile.
- [ ] Exam list.
- [ ] Time/question metadata.
- [ ] Best score display.
- [ ] Search if included in shared mobile search.

Commit: `feat(mobile): build exam library`

---

## TASK-081 — Mobile exam taking flow

- [ ] Pre-start screen.
- [ ] Start/restore attempt.
- [ ] Question/options UI.
- [ ] Navigation.
- [ ] Answer persistence.
- [ ] Server-based timer.
- [ ] Timeout submit handling.
- [ ] Submission confirmation.
- [ ] Result review colors/icons.
- [ ] Best score display.

Acceptance criteria:

- Complete timed exam can be taken on emulator/device.
- App restart/reopen behavior does not grant extra time.

Commit: `feat(mobile): build exam taking flow`

---

# Phase 9 — Search and dashboard

## TASK-090 — Backend search

Requirements: SEARCH-001..006

- [ ] Choose documented PostgreSQL search strategy.
- [ ] Add necessary indexes/migration.
- [ ] Search sets/cards/exams/folders.
- [ ] Bound/paginate results.
- [ ] Preserve Japanese Unicode behavior.

Tests:

- [ ] Japanese search cases.
- [ ] Soft-deleted content excluded.

Commit: `feat(search): implement learning content search`

---

## TASK-091 — Web global search

- [ ] Search page/input.
- [ ] Group results by domain.
- [ ] Link results to content.
- [ ] Loading/empty/error states.

Commit: `feat(web): add global search`

---

## TASK-092 — Dashboard

Requirements: DASH-001..004

- [ ] Quick navigation.
- [ ] Recent flashcard sets.
- [ ] Recent exams.
- [ ] Best scores where available.
- [ ] Keep implementation simple.

Commit: `feat(web): add learning dashboard`

---

# Phase 10 — Soft delete, trash, data safety

## TASK-100 — Verify soft-delete consistency

- [ ] Review every core query for deleted filtering.
- [ ] Review cascade behavior.
- [ ] Ensure duplicate/search/export ignore deleted content.
- [ ] Add restore endpoints/UI only where selected.
- [ ] Ensure non-empty folder delete behavior is explicit.

Tests:

- [ ] Deleted resources absent from normal lists/search.
- [ ] Restore works where implemented.

Commit: `fix(data): enforce soft-delete consistency`

---

# Phase 11 — Security hardening

## TASK-110 — Markdown rendering sanitization

- [ ] Select safe Markdown rendering libraries.
- [ ] Sanitize HTML/script vectors on web.
- [ ] Apply equivalent safe rendering policy on mobile.
- [ ] Add XSS regression tests.

Commit: `security: harden Markdown rendering`

---

## TASK-111 — API security hardening

- [ ] Verify auth on protected routes.
- [ ] Verify CORS configuration.
- [ ] Verify rate limits.
- [ ] Verify upload size limits.
- [ ] Verify production-safe errors.
- [ ] Verify secret-free logs.
- [ ] Verify no answer leakage from any live attempt endpoint.
- [ ] Verify arbitrary option/question submission rejection.

Acceptance criteria:

- `07_SECURITY.md` release checklist passes locally/staging.

Commit: `security: harden API boundaries`

---

# Phase 12 — Testing completion

## TASK-120 — Unit test completion

- [ ] Parser coverage complete.
- [ ] Scoring coverage complete.
- [ ] Folder depth coverage complete.
- [ ] Exam version logic coverage complete.
- [ ] Validation coverage complete.

Acceptance criteria:

- All mandatory unit cases in `08_TESTING.md` pass.

Commit: `test: complete domain unit coverage`

---

## TASK-121 — Integration test completion

- [ ] Auth integration tests.
- [ ] CRUD integration tests.
- [ ] Import transaction tests.
- [ ] Attempt lifecycle tests.
- [ ] Best-result tests.
- [ ] Fresh DB migration test.

Commit: `test: complete backend integration coverage`

---

## TASK-122 — Web E2E completion

- [ ] Login.
- [ ] Flashcard management/study.
- [ ] Flashcard import.
- [ ] Exam import/create.
- [ ] Timed exam.
- [ ] Result review.
- [ ] Lower-score best result behavior.

Commit: `test(web): complete critical E2E journeys`

---

## TASK-123 — Mobile smoke/E2E completion

- [ ] Login.
- [ ] Flashcard study.
- [ ] Exam list.
- [ ] Timed exam.
- [ ] Submit/result.

Commit: `test(mobile): complete critical smoke flows`

---

# Phase 13 — Deployment and operations

## TASK-130 — Production build configuration

- [ ] Production web build.
- [ ] Production API build.
- [ ] API container image.
- [ ] Web container/platform config.
- [ ] Reverse proxy/edge configuration.
- [ ] HTTPS plan/config.
- [ ] Production env validation.

Acceptance criteria:

- Production-equivalent environment boots successfully.

Commit: `chore(deploy): add production build configuration`

---

## TASK-131 — CI pipeline

- [ ] Install with lockfile.
- [ ] Lint.
- [ ] Typecheck.
- [ ] Unit tests.
- [ ] Integration tests.
- [ ] Build.
- [ ] Migration validation.
- [ ] Container build if used.

Acceptance criteria:

- Broken lint/test/build causes pipeline failure.

Commit: `ci: add project validation pipeline`

---

## TASK-132 — Backup and restore

Requirements: BACKUP-001..003

- [ ] Add documented backup command/job.
- [ ] Configure retention.
- [ ] Store backup outside live DB volume where feasible.
- [ ] Document restore.
- [ ] Perform restore into isolated DB.
- [ ] Verify application can read restored data.

Acceptance criteria:

- Restore test is actually performed, not only documented.

Commit: `ops: add verified database backup and restore`

---

## TASK-133 — Deployment smoke test

- [ ] Health endpoint passes.
- [ ] Login works.
- [ ] Flashcard CRUD works.
- [ ] Flashcard import works.
- [ ] Exam start/submit works.
- [ ] Timer behavior works.
- [ ] Best score works.
- [ ] No answer leakage observed.
- [ ] Logs contain no secrets.

Commit: only if fixes/config changes were needed.

---

# Phase 14 — Documentation synchronization

## TASK-140 — API documentation sync

- [ ] OpenAPI matches implementation.
- [ ] Endpoint examples are correct.
- [ ] Error codes documented.
- [ ] Auth behavior documented.
- [ ] Attempt response documented without correctness leakage.

Commit: `docs: synchronize API documentation`

---

## TASK-141 — Developer setup documentation

- [ ] Document prerequisites.
- [ ] Document install.
- [ ] Document local DB start.
- [ ] Document migrations.
- [ ] Document web/api/mobile start commands.
- [ ] Document test commands.
- [ ] Document environment variables.

Commit: `docs: finalize developer setup guide`

---

## TASK-142 — Final docs audit

- [ ] Requirements match implementation.
- [ ] Architecture matches implementation.
- [ ] DB doc matches Prisma schema.
- [ ] API doc matches routes/OpenAPI.
- [ ] Markdown spec matches parsers/exporters.
- [ ] UI doc matches shipped flows.
- [ ] Security checklist matches configuration.
- [ ] Testing doc matches suites.
- [ ] Deployment doc matches production method.
- [ ] Decisions file reflects all significant deviations.

Commit: `docs: complete final project documentation audit`

---

# Phase 15 — Final release gate

## TASK-150 — Full validation

Run from clean checkout/environment where practical:

- [ ] `pnpm install` succeeds.
- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] Web E2E critical path passes.
- [ ] Mobile smoke path passes.
- [ ] Web production build passes.
- [ ] API production build passes.
- [ ] Mobile typecheck/build smoke passes.
- [ ] Fresh database migration passes.
- [ ] Backup restore test has passed.
- [ ] Security release checklist passes.
- [ ] No critical/high bug remains.
- [ ] No mandatory task remains unchecked.

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

- [ ] Tag/version the completed V1 release according to chosen versioning policy.
- [ ] Record final deployment/version information.
- [ ] Confirm `task.md` contains no unchecked mandatory tasks.
- [ ] Confirm production service health.
- [ ] Confirm most recent backup is valid.

Project may be declared **100% complete for V1** only after TASK-151 is fully satisfied.
