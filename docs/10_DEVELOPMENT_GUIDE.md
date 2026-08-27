# 10 — Development Guide

## 1. Engineering principles

- Correctness before speed
- Simple architecture before clever abstraction
- Server authority for business rules
- Test business-critical code
- Small, reviewable commits
- No silent requirement drift

---

## 2. TypeScript rules

- Strict TypeScript mode
- Avoid `any`; justify exceptions
- Use explicit domain enums
- Avoid unsafe type assertions
- Keep DTOs separate from persistence entities
- Shared contracts must not expose secrets/internal-only fields

---

## 3. Backend coding rules

- Controllers: transport only
- Services: use cases/business logic
- Prisma access: centralized enough to test and reason about
- Parser: pure or near-pure
- Scoring: pure function/service
- Use transactions for multi-record invariant changes
- Do not return Prisma records directly when that risks leaking internal fields

---

## 4. Frontend coding rules

- API access through a central client layer
- Handle loading/error/empty states
- Do not duplicate backend business validation as authority
- Use accessible controls
- Avoid large page components; extract domain UI components
- Never infer correct answers before server returns graded result

---

## 5. Mobile coding rules

- Mobile is an independent Android Native Kotlin + Jetpack Compose Gradle project;
  it is not a pnpm workspace package.
- Keep Retrofit/OkHttp behind repositories and map transport DTOs to domain models.
- Keep UI state in ViewModels using Coroutines + Flow; do not put network/business
  logic in Activities or Composables.
- Do not reuse web DOM-specific UI code
- Store auth material encrypted with Android Keystore and persist it through DataStore.
- Treat network failures as normal mobile conditions
- Do not implement hidden offline synchronization. The Phase 2 Android Room
  projection is read-only, bounded, and non-authoritative; it is not a sync queue.
- Keep the active FSRS review queue in the ViewModel and cap it at 20 cards.
- Reuse the same client request id when a rating is retried after a network
  failure; the server remains authoritative for the next due time.
- Keep exam mistake reads bounded to 20 items and do not add correctness fields
  to the review DTO. Practice requests carry selected mistake ids only; server
  snapshots own grading metadata and `isPractice` skips official best/mistake
  writes.
- Keep Android Room reads online-first and summary-only. Enforce row and age
  bounds in the cache layer, clean expired rows before reads, render an
  explicit stale/offline notice, and never allow cache failures to hide a
  successful server response.
- Do not persist active attempts, answer keys, FSRS transitions, or pending
  mutations in the read cache.
- Search input must retain Unicode text, debounce at 300 ms, cancel obsolete
  requests, and use bounded memory-only recent-query caches. Prefer exact/prefix
  result relevance before recency, and highlight matches as escaped UI text
  rather than injecting HTML.

From the repository root, mobile checks are run with:

```text
cd apps/mobile
./gradlew testDebugUnitTest lintDebug assembleDebug
adb install -r "app/build/outputs/apk/debug/Japanese Study Hub-debug.apk"
```

The Android review unit tests cover the queue bound, reveal/rating state, and
request-id reuse after a failed submission. The review screen uses the same
Retrofit base URL and bearer session as the rest of the app.

The API endpoint is centralized in `BuildConfig.API_BASE_URL`. Debug builds default
to `http://localhost:4000/api/v1`. On a physical device connected over USB, run
`adb reverse tcp:4000 tcp:4000` before starting the local API. For an Android
emulator whose host machine is the local API, use:

```bash
./gradlew assembleDebug -PapiBaseUrl=http://10.0.2.2:4000/api/v1
```

For an installable APK that uses the production API, build the `production` variant:

```bash
./gradlew assembleProduction
adb install -r "app/build/outputs/apk/production/Japanese Study Hub.apk"
```

Production and release builds default to `http://157.173.127.217:4000/api/v1`, and
`-PapiBaseUrl=...` is the supported build-time override. The `production` variant
uses the local debug keystore only for owner/device validation; no signing key or
release secret is stored in the repository.

### Phase 2 validation commands

From the repository root:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm perf:bundle
pnpm perf:api-smoke
```

The opt-in API integration and migration suites are:

```powershell
$env:RUN_API_INTEGRATION = '1'
pnpm --filter @japanese-learning/api test:integration
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-phase2-migrations.ps1
```

Run Android's complete local gate from `apps/mobile`:

```text
./gradlew testDebugUnitTest lintDebug assembleDebug assembleProduction verifyApiBaseUrls connectedDebugAndroidTest --no-daemon --console=plain
```

### Cache debugging guidance

Use the Web `getQueryCacheStats` helper and centralized query keys to inspect
query count, active/stale count, search-key count, and live-attempt count in a
development test or debugger. Verify that search keys stay at or below 30 and
that live attempts have zero garbage-collection time. Do not log query data,
authorization headers, tokens, answer keys, or full learning content.

For Android, verify Room behavior through the bounded summary projections and
the visible stale/offline state. Cleanup runs before reads and rows are limited
to 100 per summary projection and seven days old. Never inspect or add active
attempts, correctness metadata, FSRS transitions, or pending mutations to this
read cache. Cache failures must remain best-effort and cannot replace a network
response.

---

## 6. Validation rules

Every write use case shall have:

- Transport/schema validation
- Domain validation
- Persistence constraint handling

Return actionable error codes.

---

## 7. Error handling

Expected domain errors should be typed/structured.

Unexpected errors:

- Log context
- Return safe generic message
- Add regression test when a bug is fixed

---

## 8. Logging

Use structured logging.

Log events, not arbitrary huge objects.

Never log secrets.

---

## 9. Commit rules

After each completed task in `tasks/task.md`:

- Run required checks
- Fix failures
- Update docs/tests
- Commit completed work

A task may contain multiple commits if the change is naturally separable.

Recommended message forms:

```text
feat(api): add flashcard set CRUD
fix(exams): prevent answer leakage in attempt payload
 test(import): cover invalid answer keys
 docs: document deployment backup flow
```

Do not commit broken intermediate code to the main integration branch unless using an explicitly disposable work branch.

---

## 10. Branch strategy

For a small project, simple trunk-based or short-lived feature branches are sufficient.

Avoid elaborate GitFlow unless needed.

---

## 11. Definition of Done for every task

A task is done only when:

1. Acceptance criteria are met.
2. Relevant tests exist and pass.
3. Lint/typecheck pass.
4. No known regression is introduced.
5. Documentation is updated if behavior/contracts changed.
6. Error cases are handled.
7. Code is committed.

---

## 12. Bug handling

When a task reveals a bug:

1. Stop progression on the dependent path.
2. Reproduce the bug.
3. Identify root cause.
4. Fix root cause, not just symptom.
5. Add regression test.
6. Run affected and global checks.
7. Confirm no data migration/contract damage.
8. Commit fix.
9. Only then continue to the next dependent task.

---

## 13. Documentation drift prevention

If implementation requires changing an approved requirement:

- Update `01_REQUIREMENTS.md` intentionally.
- Record the reason in `11_DECISIONS.md` when architectural/product-significant.
- Update API/DB/UI/security docs affected.
- Update `tasks/task.md` if scope changes.

Do not silently make the code the new source of truth.
