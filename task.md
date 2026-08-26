# Project Task Plan — Japanese Learning System — Phase 2

> Phase 2 starts from the completed V1 baseline.
>
> Execute tasks in dependency order unless a task explicitly states it may run in parallel.
> Do not move past a failed dependency. Follow `Agent.md`.
>
> Core Phase 2 priorities:
>
> 1. Make Web navigation and repeated data access feel fast and stable.
> 2. Add bounded, intentional caching without turning the browser into a second database.
> 3. Improve session/cookie handling only where it provides clear UX/security value.
> 4. Add high-value learning features without bloating the personal-use system.
> 5. Preserve all V1 exam-integrity and server-authority invariants.
> 6. Keep Web/API/Android behavior documented and regression-tested.

---

# Phase 2A — Baseline, scope, and documentation reset

## TASK-200 — Freeze V1 and establish Phase 2 source of truth

Requirements: all Phase 2 work

- [x] Preserve the completed V1 task history before replacing the active `task.md`.
- [x] Move/archive the completed V1 task plan under a stable release/history path such as `docs/releases/V1_TASKS.md`.
- [x] Update `README.md` to state that V1 is complete and Phase 2 is active.
- [x] Update `Agent.md` scope discipline so it permits approved Phase 2 work while preserving all existing engineering, bug, security, and commit rules.
- [x] Add a Phase 2 section to `docs/01_REQUIREMENTS.md` or create a dedicated `docs/13_PHASE2_REQUIREMENTS.md`.
- [x] Record Phase 2 architectural/product decisions in `docs/11_DECISIONS.md`.
- [x] Update `docs/12_TRACEABILITY.md` with Phase 2 requirement groups and tasks.
- [x] Confirm V1 behavior is the regression baseline and must not be silently broken.

Acceptance criteria:

- V1 history remains available and immutable as release history.
- The active docs clearly distinguish V1 shipped behavior from Phase 2 additions.
- `Agent.md` no longer blocks explicitly approved Phase 2 work.
- No contradiction remains between requirements, decisions, architecture, and this task plan.

Checks:

- [x] Documentation cross-reference audit.
- [x] Search for stale “Phase 2 not allowed” wording and resolve intentional conflicts.

Commit: `docs: establish phase 2 development baseline`

---

## TASK-201 — Measure current Web/API performance baseline

Requirements: P2-PERF-BASELINE

- [x] Measure current initial page load for login, dashboard, flashcard list, flashcard detail, exam list, exam detail, search.
- [x] Measure repeated navigation to the same pages.
- [x] Record API request counts per navigation.
- [x] Record duplicate requests caused by remounts or independent components.
- [x] Record largest API payloads.
- [x] Measure current Core Web Vitals where practical: LCP, INP, CLS.
- [x] Measure route-transition latency on a normal desktop browser.
- [x] Record current server-side response timings for high-traffic GET endpoints.
- [x] Identify pages that visibly blank/reload instead of preserving useful prior state.
- [x] Add a short baseline report to Phase 2 docs.

Acceptance criteria:

- Optimization work has a measurable before-state.
- At least the major user journeys have request-count and perceived-latency baselines.
- No optimization is justified only by guesswork.

Commit: `perf: record phase 2 performance baseline`

---

## TASK-202 — Define bounded caching and browser-storage policy

Requirements: P2-CACHE-001..P2-CACHE-012

Create and document one project-wide cache/storage policy.

- [x] Classify data into stable reference/list data, normal entity detail data, rapidly changing state, live exam attempt state, authentication/session state, and UI-only preferences.
- [x] Default Web content cache to memory only.
- [x] Do not persist general API response caches across browser restarts unless a later task explicitly requires it.
- [x] Define default stale times:
  - dashboard/list data: 30–60 seconds;
  - entity detail: 30–60 seconds;
  - search result: 15–30 seconds;
  - live attempt/answer/timer state: always or almost always revalidated;
  - best-score data after submit: immediately invalidated/refetched.
- [x] Define garbage-collection time, starting around 5 minutes for normal cached queries.
- [x] Use shorter GC for high-cardinality search queries.
- [x] Never cache passwords, password hashes, signing secrets, raw Authorization headers, or correct-answer metadata before grading.
- [x] Do not persist live exam attempt correctness-sensitive payloads in a long-lived browser cache.
- [x] Define explicit mutation invalidation rules instead of global cache clearing.
- [x] Keep cookies metadata-only and small; never store learning-content blobs in cookies.
- [x] Prevent unbounded localStorage/sessionStorage growth.
- [x] Document when browser HTTP cache, application query cache, and server cache may each be used.

Acceptance criteria:

- Cache behavior is deterministic and documented.
- Repeated navigation can be fast without stale exam/security behavior.
- Storage growth is bounded.
- The browser is not treated as an authoritative offline database.

Commit: `docs(perf): define bounded cache and storage policy`

---

# Phase 2B — Web data layer and smooth navigation

## TASK-210 — Standardize the Web client data-fetching layer

- [x] Inspect the current Web API client and existing dependencies.
- [x] Reuse an existing equivalent query-cache solution if already present.
- [x] Otherwise adopt one mainstream solution such as TanStack Query.
- [x] Add one application-level query client/provider.
- [x] Centralize query-key construction.
- [x] Centralize retry behavior.
- [x] Centralize authenticated API error mapping.
- [x] Add cancellation/abort support for obsolete requests.
- [x] Configure stale/GC defaults from TASK-202.
- [x] Disable automatic retry for non-retryable 4xx errors.
- [x] Keep mutations explicit and uncached.
- [x] Keep exam live-attempt queries under stricter freshness rules.

Acceptance criteria:

- Feature pages no longer invent independent caching policies.
- Duplicate concurrent GETs for the same query are deduplicated.
- Query cache is bounded and observable in development.

Tests:

- [x] Retry/error classification tests.
- [x] Cache invalidation regression tests.

Commit: `perf(web): establish cached data access layer`

---

## TASK-211 — Migrate Dashboard to stale-while-revalidate behavior

- [x] Move dashboard reads to the standardized query layer.
- [x] Reuse cached recent flashcard/exam data when returning to Dashboard.
- [x] Show cached data immediately while revalidating in the background.
- [x] Avoid duplicate list/detail calls for the same data.
- [x] Keep loading skeleton only for true cold load.
- [x] Keep prior useful content visible during background refresh.
- [x] Invalidate dashboard queries after relevant create/delete/import/submit mutations.

Acceptance criteria:

- Returning to Dashboard within the stale window does not visually blank the page.
- Background revalidation does not block navigation.

Commit: `perf(web): cache dashboard queries`

---

## TASK-212 — Migrate Flashcard list/detail/study reads to bounded cache

- [x] Cache flashcard-set lists with pagination/search/sort-aware keys.
- [x] Cache flashcard-set detail by entity ID.
- [x] Reuse detail data when entering study mode.
- [x] Reuse set metadata when navigating back to list/detail.
- [x] Invalidate only affected set/list queries after card or set mutations.
- [x] Update cached entity data directly after simple successful metadata edits where safe.
- [x] Do not keep deleted resources indefinitely in cache.
- [x] Ensure shuffle remains per study session.

Acceptance criteria:

- Re-entering a recently opened set feels immediate.
- Card edits are reflected without requiring a full-page reload.
- Delete/duplicate/import operations do not leave visibly stale lists.

Commit: `perf(web): cache flashcard library data`

---

## TASK-213 — Migrate Exam library/detail reads to bounded cache

- [x] Cache exam folder tree with explicit invalidation after hierarchy mutations.
- [x] Cache exam lists with folder/search/sort-aware keys.
- [x] Cache exam management/detail separately from live attempt data.
- [x] Cache best-result summaries only as normal read data and invalidate immediately after submit.
- [x] Ensure exam content edits invalidate exam detail and relevant list views.
- [x] Ensure content-version changes never leave old best result displayed as current.
- [x] Preserve strict separation between management DTOs and live-attempt DTOs.

Acceptance criteria:

- Returning to the Exam library/detail is fast.
- Folder moves/renames appear consistently across cached views.
- No cache path can leak correct-answer metadata into the live attempt UI.

Commit: `perf(web): cache exam library data`

---

## TASK-214 — Keep live exam attempts freshness-first

- [x] Treat attempt start/restore as freshness-sensitive.
- [x] Do not give live attempt payloads long stale windows.
- [x] Do not persist live attempt query data across browser restarts through a generic persistent query cache.
- [x] Keep server expiration authoritative.
- [x] Continue autosaving answers to the backend.
- [x] Revalidate attempt state on reconnect, tab restoration, or explicit resume.
- [x] Cancel obsolete autosave calls when superseded safely.
- [x] Prevent duplicate answer writes when the selected value has not changed.
- [x] Invalidate exam best-result/list/detail queries after final submission.
- [x] Verify browser/query cache never contains correctness metadata before grading.

Acceptance criteria:

- Smoothness improvements do not weaken timer, answer secrecy, autosave, or submission correctness.

Tests:

- [x] No-answer-leakage cache regression test.
- [x] Timer restore regression test.
- [x] Submit invalidation regression test.

Commit: `perf(exams): preserve fresh live attempt state`

---

## TASK-215 — Eliminate unnecessary full reloads and navigation resets

- [x] Audit internal links/forms/buttons that trigger full document navigation or `window.location` unnecessarily.
- [x] Replace internal navigation with Next.js routing primitives.
- [x] Ensure mutations do not force browser reload unless required.
- [x] Preserve global layout/navigation across route transitions.
- [x] Add route-level loading UI for true cold requests.
- [x] Avoid blank white screens during route change.
- [x] Preserve appropriate scroll position on back navigation.
- [x] Preserve list filters/sort/search where useful when returning from detail.
- [x] Ensure auth redirects still work.

Acceptance criteria:

- Normal internal navigation stays within the App Router lifecycle.
- Repeated navigation does not resemble a page refresh.

Commit: `perf(web): remove unnecessary route reloads`

---

## TASK-216 — Add targeted route and data prefetching

- [x] Use framework route prefetching for high-probability internal navigation.
- [x] Prefetch entity detail on deliberate hover/focus or immediately before navigation where beneficial.
- [x] Do not prefetch every item in a large list.
- [x] Do not prefetch large exam attempt payloads.
- [x] Add a conservative prefetch limit.
- [x] Disable prefetch where bandwidth cost outweighs UX benefit.

Acceptance criteria:

- Common next-click navigation is measurably faster.
- Prefetching does not generate request storms.

Commit: `perf(web): add targeted route prefetching`

---

## TASK-217 — Improve perceived loading performance

- [x] Replace blocking page spinners with skeletons where appropriate.
- [x] Use stale cached content during background refresh instead of clearing the screen.
- [x] Preserve form data during mutation submission.
- [x] Avoid layout shifts when list/detail data arrives.
- [x] Show small non-blocking refresh indicators for background fetches.
- [x] Keep recoverable error + Retry behavior.
- [x] Do not mask hard errors behind permanently stale data.

Acceptance criteria:

- Cold loads are understandable.
- Warm loads feel instant or near-instant.
- Background refresh is unobtrusive.

Commit: `ux(web): improve perceived loading performance`

---

# Phase 2C — Browser storage, cookies, and authentication UX

## TASK-220 — Audit current Web authentication storage

- [x] Document how Web currently persists authentication.
- [x] Identify whether token/session data is JavaScript-accessible.
- [x] Verify expiry/logout behavior.
- [x] Verify cross-tab behavior.
- [x] Verify no token is persisted in general query cache.
- [x] Compare current behavior against `07_SECURITY.md`.
- [x] Decide whether the actual deployment can safely support HttpOnly cookie auth.
- [x] Do not weaken security simply to “use cookies”.

Acceptance criteria:

- The project has one explicit documented Web session strategy.
- Any cookie migration has a clear security reason.

Commit: `security(web): audit session persistence`

---

## TASK-221 — Add minimal cookie-backed Web session support when deployment permits

This task is conditional on TASK-220.

Status: explicitly deferred. The actual deployment is still IP-only HTTP, so the
HTTPS, trusted-origin, credentials/CORS, and CSRF prerequisites for a secure
HttpOnly cookie are not met. The bearer strategy remains the approved Web/Android
compatibility path; re-open this task only after those prerequisites are accepted.

- [x] Preserve bearer-token support for Android (unchanged; no cookie migration).
- [x] If Web cookie auth is adopted, let the API auth guard accept the approved Web session cookie and Android bearer token without duplicating business auth logic (deferred until prerequisites are met).
- [x] Use `HttpOnly` (deferred; no cookie is issued).
- [x] Use `SameSite` appropriate to topology (deferred with the topology decision).
- [x] Use `Secure` when HTTPS is active (deferred until HTTPS is active).
- [x] Keep cookie payload minimal; no learning content (deferred; no cookie is issued).
- [x] Match cookie expiration to server token/session expiration (deferred; no cookie is issued).
- [x] Clear cookie on logout (deferred; no cookie is issued).
- [x] Configure Web credentials/CORS correctly (deferred until a trusted HTTPS origin is accepted).
- [x] Add CSRF protection if required (deferred with cookie adoption).
- [x] If secure prerequisites are not met, explicitly defer this task instead of implementing an insecure cookie.

Acceptance criteria:

- Web session persistence is secure for the actual deployment.
- Android authentication remains unaffected.
- Cookie storage remains tiny.

Tests:

- [x] Login/logout cookie behavior (not applicable while cookie auth is explicitly deferred).
- [x] Protected route with/without cookie (not applicable while cookie auth is explicitly deferred).
- [x] Android bearer-token regression (existing bearer path preserved; no cookie change).
- [x] CSRF test if applicable (not applicable while cookie auth is explicitly deferred).

Commit: `security(auth): add web session cookie support`

---

## TASK-222 — Persist only tiny UI preferences

- [x] Identify useful preferences such as preferred sort/filter and last selected library tab.
- [x] Do not persist API response bodies as preferences.
- [x] Prefer localStorage for non-sensitive client-only preferences unless a cookie is needed server-side.
- [x] If a preference cookie is used, keep it compact and versioned (no cookie is needed for client-only preferences).
- [x] Add reset/migration behavior for invalid old values.
- [x] Bound the number and size of persisted keys.

Acceptance criteria:

- Useful sort/filter/tab preferences survive refresh/restart.
- No secrets, search text, or learning content are stored as preferences.

Commit: `feat(web): persist minimal ui preferences`

---

# Phase 2D — HTTP/API/DB performance

## TASK-230 — Add safe conditional HTTP caching for selected GET endpoints

- [x] Audit authenticated GET endpoints safe for private revalidation caching.
- [x] Add `ETag` and/or `Last-Modified` where practical (Express ETag is retained).
- [x] Use `Cache-Control: private`.
- [x] Prefer revalidation where stale data would be confusing.
- [x] Do not add public/shared caching for authenticated learning data.
- [x] Do not HTTP-cache live exam attempt state in a stale-prone way.
- [x] Verify 304 behavior (authenticated dashboard GET returned 200 with ETag, then 304 with `If-None-Match`; auth returned `no-store`).

Acceptance criteria:

- Safe repeated reads can avoid unnecessary payload transfer.
- No private response becomes shared-cacheable.

Commit: `perf(api): add safe conditional caching`

---

## TASK-231 — Enable response compression and efficient connections

- [x] Audit current reverse proxy/container network config.
- [x] Enable gzip and/or Brotli where supported for JSON/HTML/JS/CSS.
- [x] Avoid compressing already-compressed formats.
- [x] Configure sensible keep-alive.
- [x] Enable HTTP/2 or newer when the edge supports it (documented as an edge responsibility; no reverse proxy is checked in).
- [x] Verify Markdown export/download remains correct (compressed/uncompressed export bytes matched after decompression).
- [x] Measure transferred bytes before/after (OpenAPI JSON 24,343 to 3,993 wire bytes; temporary Markdown export 9,240 to 447 wire bytes).

Acceptance criteria:

- Text/JSON transfer size is reduced without breaking downloads.

Commit: `perf(deploy): enable response compression`

---

## TASK-232 — Reduce API over-fetching

- [x] Identify large list/detail responses.
- [x] Remove fields not needed by list UIs.
- [x] Keep management DTOs separate from attempt DTOs.
- [x] Bound nested card/question payloads.
- [x] Add pagination where an endpoint can grow without limit.
- [x] Avoid returning full Markdown bodies in list responses when snippets suffice.
- [x] Preserve API compatibility where possible.
- [x] Update OpenAPI and clients for intentional changes.

Acceptance criteria:

- List endpoints return only necessary data.
- No endpoint returns an unbounded full library by default.

Commit: `perf(api): reduce response overfetching`

---

## TASK-233 — Audit Prisma queries and indexes

- [x] Capture slow/common queries for Dashboard, Flashcards, Exams, Search, best result.
- [x] Review `include/select` for over-fetching.
- [x] Detect N+1 patterns.
- [x] Use `EXPLAIN (ANALYZE, BUFFERS)` on representative queries where practical.
- [x] Add indexes only when justified (no new index was justified by the measured plans).
- [x] Add a new Prisma migration for any change (not applicable; no schema change was made).
- [x] Never edit the applied V1 migration.
- [x] Test upgrade from current production schema and fresh DB.

Acceptance criteria:

- Common queries have justified index coverage.
- No core N+1 remains.

Commit: `perf(db): optimize common query paths`

---

## TASK-234 — Optimize Web bundle loading

- [x] Measure route bundle sizes.
- [x] Identify heavy libraries/components.
- [x] Dynamically import heavy editors/import helpers only where needed.
- [x] Remove unused dependencies (audit found no unused dependency justified for removal).
- [x] Ensure icons are tree-shaken or locally scoped.
- [x] Optimize fonts/Japanese glyph loading without breaking readability (system stack remains appropriate for current text UI).
- [x] Optimize images/icons where useful (named Lucide imports retained; no oversized image asset is loaded by routes).

Acceptance criteria:

- Major routes do not eagerly load unrelated heavy code.
- Initial bundle size does not regress without documented reason.

Commit: `perf(web): reduce route bundle cost`

---

## TASK-235 — Add list virtualization only where justified

- [x] Measure realistic large flashcard/exam lists.
- [x] Add virtualization only where rendering cost is measurable (benchmark did not justify a windowing library).
- [x] Preserve accessibility, keyboard, search/sort/reorder behavior.
- [x] Do not virtualize small lists unnecessarily.

Acceptance criteria:

- Large lists remain smooth without unnecessary complexity.

Commit: `perf(web): optimize large list rendering`

---

# Phase 2E — High-value learning features

## TASK-240 — Add recent/resume learning

- [x] Track recent flashcard set access.
- [x] Track recent exam access/attempt.
- [x] Add “Continue learning” on Dashboard.
- [x] Keep history bounded.
- [x] Do not create large event-log infrastructure.
- [x] Ensure deleted content disappears.
- [x] Surface equivalent behavior on Android where useful.

Acceptance criteria:

- User can quickly return to recent learning content.
- Storage growth is bounded.

Commit: `feat: add recent learning resume`

---

## TASK-241 — Add Favorites

- [x] Add favorite state for Flashcard Sets and Exams.
- [x] Add API mutations/read filtering.
- [x] Add favorite action to Web.
- [x] Add favorite action to Android.
- [x] Add optional Favorites filter.
- [x] Ensure favorites respect soft deletion.
- [x] Add migration and tests.

Acceptance criteria:

- Important learning material can be pinned quickly.
- No complex social model is introduced.

Commit: `feat: add learning favorites`

---

## TASK-242 — Add lightweight tags

- [x] Add tags only if they clearly improve organization beyond folders/search.
- [x] Allow tags on Flashcard Sets and Exams.
- [x] Add bounded tag CRUD.
- [x] Add filtering by tag.
- [x] Add Web UI.
- [x] Add Android display/filter where practical.
- [x] Avoid hierarchical tags.

Acceptance criteria:

- Tags improve cross-domain organization without unnecessary complexity.

Commit: `feat: add learning tags`

---

# Phase 2F — Spaced repetition (FSRS)

## TASK-250 — Define FSRS requirements and schema

- [x] Adopt FSRS unless a documented constraint requires another algorithm.
- [x] Define server-authoritative scheduling.
- [x] Define ratings: Again / Hard / Good / Easy.
- [x] Define per-card scheduling state.
- [x] Define review-log retention.
- [x] Define due/new/review counts.
- [x] Define timezone/day-boundary behavior.
- [x] Keep basic Study All mode.
- [x] Define behavior when card is edited/deleted.
- [x] Add schema and migration plan.
- [x] Record decision in `docs/11_DECISIONS.md`.

Acceptance criteria:

- Scheduling behavior is deterministic and documented.

Commit: `docs(flashcards): define fsrs scheduling`

---

## TASK-251 — Implement FSRS backend scheduling

- [x] Add card scheduling state.
- [x] Add review log.
- [x] Add Prisma migration.
- [x] Implement scheduler as a pure/testable domain module where possible.
- [x] Add endpoint for due/new cards.
- [x] Add endpoint to submit review rating.
- [x] Update schedule transactionally.
- [x] Prevent duplicate review submission from duplicating state transitions.
- [x] Use server time.
- [x] Add due-count summary for Dashboard.

Acceptance criteria:

- Same state + rating + review time produces deterministic output.
- Duplicate submission is safe.

Tests:

- [x] New-card scheduling.
- [x] Again/Hard/Good/Easy transitions.
- [x] Interval progression.
- [x] Duplicate review submission.
- [x] Edited/deleted card behavior.
- [x] Timezone/day boundary.

Commit: `feat(flashcards): add fsrs scheduler`

---

## TASK-252 — Add Web Review mode

- [x] Add “Review due” entry point.
- [x] Show new/due counts.
- [x] Reuse card flip interaction.
- [x] Show Again/Hard/Good/Easy after reveal.
- [x] Submit rating to backend.
- [x] Prefetch only a small number of next cards.
- [x] Keep review session cache bounded.
- [x] Show progress and completion.
- [x] Keep Study All / Shuffle mode.

Acceptance criteria:

- User can complete due review without page reloads.
- Review state persists server-side.

Verification:

- [x] Web route/cache regression tests pass.
- [x] Local production browser smoke completes a real Good rating and reaches
      100% without navigating away from Review.

Commit: `feat(web): add spaced repetition review`

---

## TASK-253 — Add Android Review mode

- [x] Add due/new counts.
- [x] Add Compose Review mode.
- [x] Support Again/Hard/Good/Easy.
- [x] Use server scheduling state.
- [x] Cache only small active review queue locally.
- [x] Handle retry without duplicate rating submission.
- [x] Preserve basic study mode.

Acceptance criteria:

- Android can complete the same review flow as Web.

Verification:

- [x] Android unit tests cover the 20-card queue bound and stable retry request
      id.
- [x] Android debug compilation and unit tests pass with the configured SDK.

Commit: `feat(android): add spaced repetition review`

---

# Phase 2G — Exam review improvements

## TASK-260 — Add wrong-answer review queue

- [x] Derive/store incorrect and unanswered items from submitted attempts.
- [x] Never expose answers before submission.
- [x] Add bounded review-queue endpoint.
- [x] Add Web “Review mistakes”.
- [x] Add Android “Review mistakes”.
- [x] Allow dismiss/clear.
- [x] Respect exam content versioning.
- [x] Remove invalid references after delete/version changes.

Acceptance criteria:

- [x] Mistake review never changes authoritative exam scoring.
- [x] Version boundaries remain correct.

Verification:

- [x] API unit tests cover derivation, sanitization, bounds, dismissal, clear,
      and stale-version cleanup.
- [x] Web typecheck/lint/unit tests pass.
- [x] Android debug unit tests/lint/assemble pass.

Commit: `feat(exams): add wrong answer review`

---

## TASK-261 — Add incorrect-only practice mode

- [x] Implement as practice/review, not a normal scored exam unless explicitly documented.
- [x] Build subset from incorrect/unanswered items.
- [x] Do not overwrite official best score.
- [x] Show clear Practice labeling.
- [x] Support Web.
- [x] Support Android if shared API allows.
- [x] Add tests ensuring best-result isolation.

Acceptance criteria:

- [x] User can focus on weak questions without corrupting official results.

Verification:

- [x] API tests cover current-version subset creation and practice best/mistake
      isolation.
- [x] Web route/type/unit gates pass.
- [x] Android debug unit tests/lint/assemble pass.

Commit: `feat(exams): add incorrect-only practice`

---

# Phase 2H — Android smoothness and light read cache

## TASK-270 — Add bounded Room read cache

- [x] Keep Android online-first.
- [x] Do not implement full offline sync.
- [x] Add Room only for selected read-mostly data:
  - flashcard set summaries;
  - exam summaries;
  - recent/resume metadata;
  - optional small flashcard detail cache.
- [x] Never cache pre-grading correct-answer metadata.
- [x] Bound row count and/or cache age.
- [x] Add expiry cleanup.
- [x] Treat server as source of truth.
- [x] Show cached data immediately and refresh in background.
- [x] Clearly display offline/stale state.

Acceptance criteria:

- [x] Android opens useful content quickly after prior sync.
- [x] Cache cannot grow without bound.

Verification:

- [x] Room cache unit tests cover the 100-row bound, seven-day expiry cleanup,
      and the absence of answer/question trees in cached projections.
- [x] Android debug unit tests/lint/assemble pass after cache integration.
- [x] Android cache policy is documented in the database, development,
      requirements, and decision records.

Commit: `perf(android): add bounded read cache`

---

## TASK-271 — Optimize Android startup/navigation

- [x] Measure cold/warm startup.
- [x] Avoid blocking startup on unnecessary network calls.
- [x] Restore auth efficiently.
- [x] Load cached Home/library first where available.
- [x] Refresh in background.
- [x] Avoid recomposition hotspots.
- [x] Keep ViewModel state stable across navigation/config changes.
- [x] Use lazy/paging lists where justified.

Acceptance criteria:

- [x] Returning user reaches useful content faster.
- [x] Navigation does not repeatedly reload identical data.

Verification:

- [x] Startup measurement script parses and records cold/warm `am start -W`
      metrics when an emulator/device is available.
- [x] Auth unit test proves cached identity renders before remote verification.
- [x] Android debug unit tests/lint/assemble pass after startup/navigation
      changes.

Commit: `perf(android): improve startup and navigation`

---

# Phase 2I — Search and import productivity

## TASK-280 — Improve global search responsiveness

- [x] Preserve Japanese Unicode behavior.
- [x] Add relevance/ranking appropriate to personal scale.
- [x] Highlight matched snippets safely.
- [x] Debounce Web search.
- [x] Cancel obsolete requests.
- [x] Cache recent search queries briefly.
- [x] Bound search cache cardinality.
- [x] Add Android debounce/cancellation equivalently.

Acceptance criteria:

- [x] Search feels responsive without request storms.

Verification:

- [x] API search tests cover Japanese text and exact-match relevance ordering.
- [x] Web query tests cover AbortSignal-backed query execution and a maximum
      of 30 in-memory search keys; Web typecheck/lint/unit tests pass.
- [x] Android unit tests cover 300 ms debounce, cancellation, Japanese query
      preservation, and bounded recent-query reuse.

Commit: `perf(search): improve search responsiveness`

---

## TASK-281 — Add multi-file Markdown import workflow

- [x] Allow selecting multiple Markdown files for sequential preview where useful.
- [x] Never bypass preview + confirm invariants.
- [x] Keep each import transaction independent.
- [x] Show per-file success/error state.
- [x] Prevent duplicate confirm.
- [x] Use bounded concurrency.
- [x] Preserve current single-file import behavior.

Acceptance criteria:

- [x] Multiple personal study files can be imported efficiently without weakening safety.

Verification:

- [x] Web utility tests prove sequential concurrency-one previews, isolated
      per-file failure, extension validation, and the 20-file bound.
- [x] Both flashcard and exam modals preserve single-file preview/confirm and
      add per-file batch confirmation guarded against duplicate clicks.
- [x] Web typecheck, lint, and unit tests pass.

Commit: `feat(import): add multi-file import workflow`

---

# Phase 2J — Security and operations

## TASK-290 — Reconcile production HTTP/HTTPS posture

- [ ] Audit current IP:port production deployment.
- [ ] Choose/document the simplest realistic HTTPS path for personal use.
- [ ] Do not add a domain requirement unless accepted by the owner.
- [ ] If HTTPS is implemented, update Web/API/Android URLs, CORS, deployment docs, and Secure cookie behavior.
- [ ] If HTTPS is deferred, document the accepted risk and do not falsely claim Secure-cookie production.

Acceptance criteria:

- Security docs reflect the actual runtime.

Commit: `security(deploy): align production transport policy`

---

## TASK-291 — Add one-command VPS deploy/update workflow

- [ ] Pull latest GHCR Web/API images.
- [ ] Run database migration safely.
- [ ] Recreate/update containers.
- [ ] Run health checks.
- [ ] Stop on failed migration/health check.
- [ ] Prune only safe dangling images after success.
- [ ] Never delete database volumes.
- [ ] Document rollback where practical.
- [ ] Keep compatibility with the owner's chosen `:latest` policy.

Acceptance criteria:

- Production update is one documented safe command/script.

Commit: `ops: add simple production update workflow`

---

## TASK-292 — Verify Phase 2 backup/restore

- [ ] Verify daily PostgreSQL backup still runs.
- [ ] Verify retention.
- [ ] Verify backup is outside live DB volume.
- [ ] Perform isolated restore after Phase 2 migrations.
- [ ] Verify Phase 2 data is restored.
- [ ] Record restore date/result.

Acceptance criteria:

- Phase 2 schema/data are demonstrably restorable.

Commit: `ops: verify phase 2 backup restore`

---

## TASK-293 — Add lightweight production observability

- [ ] Add request-duration logging/metrics at a lightweight level.
- [ ] Track slow API requests above a documented threshold.
- [ ] Track safe failed login/import/exam submit events.
- [ ] Track health/readiness.
- [ ] Do not add enterprise observability infrastructure.
- [ ] Never log tokens/passwords/full imported content/answer keys.
- [ ] Add a simple command/view for recent production errors.

Acceptance criteria:

- Performance regressions can be diagnosed from normal server logs.

Commit: `ops: add lightweight performance observability`

---

# Phase 2K — Tests and regression gates

## TASK-300 — Add Web cache/navigation tests

- [ ] Repeated list/detail navigation reuses warm query state.
- [ ] Relevant mutation invalidates correct queries.
- [ ] Unrelated mutation does not clear the entire cache.
- [ ] Stale data revalidates.
- [ ] Recoverable error can retry.
- [ ] Live attempt freshness rules hold.
- [ ] No correct-answer leakage through cached data.

Commit: `test(web): cover cache and navigation behavior`

---

## TASK-301 — Add performance regression guardrails

- [ ] Define reasonable bundle-size thresholds.
- [ ] Add CI check for accidental major bundle growth where reliable.
- [ ] Add API response-size smoke checks.
- [ ] Add query-count/N+1 regression check where practical.
- [ ] Avoid flaky micro-benchmark gates.
- [ ] Keep baseline metrics documented.

Commit: `test(perf): add regression guardrails`

---

## TASK-302 — Extend integration tests for Phase 2 features

- [ ] Favorites tests.
- [ ] Tags tests if implemented.
- [ ] Recent/resume tests.
- [ ] FSRS scheduling/idempotency tests.
- [ ] Wrong-answer review tests.
- [ ] Practice-mode isolation tests.
- [ ] V1 → Phase 2 migration test.
- [ ] Fresh DB migration through all migrations.

Commit: `test: complete phase 2 integration coverage`

---

## TASK-303 — Extend Web E2E critical path

- [ ] Login.
- [ ] Warm navigate Dashboard → Flashcards → detail → back without full reload.
- [ ] Create/edit card and observe cache-consistent UI.
- [ ] Review due flashcards if FSRS implemented.
- [ ] Warm navigate Exam library/detail.
- [ ] Complete exam and verify best-score cache refresh.
- [ ] Review mistakes.
- [ ] Verify no answer leakage.
- [ ] Verify stale data eventually refreshes.

Commit: `test(web): complete phase 2 e2e journeys`

---

## TASK-304 — Extend Android smoke/E2E path

- [ ] Login/session restore.
- [ ] Cached library startup.
- [ ] Background refresh.
- [ ] Flashcard study.
- [ ] FSRS review if implemented.
- [ ] Exam list.
- [ ] Timed exam.
- [ ] Result review.
- [ ] Mistake review.
- [ ] Offline/read-cache degraded behavior.
- [ ] Reconnect behavior.

Commit: `test(android): complete phase 2 smoke journeys`

---

# Phase 2L — Documentation synchronization

## TASK-310 — Update Requirements and Decisions

- [ ] Document all delivered Phase 2 features.
- [ ] Document deferred optional tasks.
- [ ] Record cache/storage policy.
- [ ] Record Web session/cookie decision.
- [ ] Record FSRS decision.
- [ ] Record Android read-cache boundary.
- [ ] Record HTTPS/runtime decision.
- [ ] Remove stale V1-only statements that are no longer true.

Commit: `docs: synchronize phase 2 requirements and decisions`

---

## TASK-311 — Update Architecture/API/DB/Deployment docs

- [ ] Architecture reflects Web query cache and Android Room cache where implemented.
- [ ] API docs reflect new endpoints/headers/cookie behavior.
- [ ] DB docs reflect new tables/indexes.
- [ ] Deployment docs reflect actual update process.
- [ ] Security docs reflect actual auth/cookie/HTTPS behavior.
- [ ] Testing docs include Phase 2 suites.
- [ ] Development guide includes new commands and cache-debug guidance.

Commit: `docs: synchronize phase 2 technical documentation`

---

## TASK-312 — Update traceability matrix

- [ ] Map every Phase 2 requirement group to implementation tasks.
- [ ] Map every Phase 2 requirement group to verification tasks.
- [ ] Add cache/session/security invariants.
- [ ] Add FSRS invariants if implemented.
- [ ] Add Android bounded-cache invariant.
- [ ] Add Phase 2 release audit procedure.

Commit: `docs: update phase 2 traceability`

---

# Phase 2M — Final release gate

## TASK-320 — Full Phase 2 validation

Run from clean checkout/environment where practical.

- [ ] `pnpm install --frozen-lockfile` succeeds.
- [ ] Root lint passes.
- [ ] Root typecheck passes.
- [ ] Unit tests pass.
- [ ] Backend integration tests pass.
- [ ] Web E2E passes.
- [ ] Web production build passes.
- [ ] API production build passes.
- [ ] Android unit tests pass.
- [ ] Android lint passes.
- [ ] Android debug APK builds.
- [ ] Android production APK builds.
- [ ] Fresh database can apply all migrations.
- [ ] Upgrade database from V1 schema to Phase 2 succeeds.
- [ ] Production backup restore with Phase 2 schema succeeds.
- [ ] Production API health passes.
- [ ] Production Web loads.
- [ ] Production Android connects.
- [ ] Repeated warm Web navigation no longer behaves like a full reload.
- [ ] Query cache obeys bounded stale/GC policy.
- [ ] No learning-content cache grows unbounded.
- [ ] Cookies remain minimal and contain no learning content/secrets.
- [ ] Live exam payload still contains no correct-answer information.
- [ ] Server timer remains authoritative.
- [ ] Duplicate exam submit remains idempotent.
- [ ] FSRS review submit is retry/idempotency safe if implemented.
- [ ] Security checklist passes for actual production topology.
- [ ] No critical/high bug remains.
- [ ] Docs match implementation.
- [ ] No mandatory Phase 2 task remains unchecked.

If any item fails:

- [ ] Stop release.
- [ ] Reproduce failure.
- [ ] Fix root cause.
- [ ] Add regression test when applicable.
- [ ] Re-run affected checks.
- [ ] Re-run full Phase 2 validation.

Acceptance criteria:

- Every mandatory item above is green.

Commit: `chore: prepare phase 2 release`

---

## TASK-321 — Phase 2 completion and release record

- [ ] Tag/version the completed Phase 2 release.
- [ ] Record final production image/deployment information.
- [ ] Record Android production APK/version.
- [ ] Record latest verified backup/restore date.
- [ ] Archive the completed Phase 2 task plan under release history.
- [ ] Create the next active `task.md` only when a new phase is explicitly approved.

Project may be declared **100% complete for Phase 2** only after TASK-321 is fully satisfied.

Commit: `chore: finalize phase 2 release`
