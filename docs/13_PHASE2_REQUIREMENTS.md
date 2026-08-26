# 13 — Phase 2 Requirements

## 1. Status and boundary

Phase 2 is the approved post-V1 iteration of the Japanese Learning System. V1
behavior remains the regression baseline. Phase 2 may add the capabilities in
this document, but it must preserve the V1 server-authority, import, soft-delete,
security, and data-integrity invariants.

The system remains a personal-use modular monolith. The browser and Android app
may cache bounded read data for responsiveness, but PostgreSQL and the API remain
the source of truth. No Phase 2 feature creates an offline synchronization engine,
social model, or second persistence authority.

## 2. Performance and cache requirements

### P2-PERF-BASELINE

Before optimization, record page/request/payload and representative API timing
baselines for the major Web journeys. The report must identify duplicate requests,
blank transitions, and practical Core Web Vital observations where tooling permits.

### P2-CACHE-001 — Bounded Web query cache

Web content reads use one application-level in-memory query cache with centralized
keys, retry/error classification, cancellation, and explicit mutation invalidation.
The default policy is:

| Data                        |                            Stale time | Garbage collection |
| --------------------------- | ------------------------------------: | -----------------: |
| Dashboard and library lists |                            45 seconds |          5 minutes |
| Entity detail               |                            45 seconds |          5 minutes |
| Search                      |                            20 seconds |          2 minutes |
| Best result after submit    |        immediate invalidation/refetch |             normal |
| Live attempt                | freshness-first; no long stale window |     session-scoped |

The cache is memory-only across browser restarts. It must deduplicate concurrent
reads, avoid unbounded search cardinality, and never contain passwords, secrets,
raw authorization headers, or pre-grading correctness metadata.

The complete data classification, key, invalidation, HTTP, and storage rules are
defined in `docs/performance/cache-storage-policy.md`.

The current Web session decision and cookie deferral are recorded in
`docs/security/web-auth-session-audit.md`.

TASK-222's implemented allow-list and search-text exclusion are recorded in
`docs/performance/ui-preferences.md`.

### P2-CACHE-002 — Explicit invalidation

Set/card mutations invalidate only affected set, list, dashboard, and search keys.
Exam/folder/content mutations invalidate only affected exam/folder/list/dashboard
keys. Submission invalidates the current exam's best-result/detail/list and
dashboard keys. Live attempts are never made fresh by an unrelated cache policy.

### P2-CACHE-003 — Fresh live attempts

Starting, restoring, autosaving, and submitting an attempt always use server
state. Attempt data is not persisted by a generic long-lived browser cache. Resume,
reconnect, visibility restoration, and explicit retry revalidate the attempt; the
server remains authoritative for expiration and answer validity.

### P2-CACHE-004 — Minimal browser storage

Cookies and local/session storage contain only authentication material or bounded,
versioned UI preferences as documented by the security decision. Learning-content
blobs and live attempt payloads are not stored there. Preference keys have a fixed
allow-list and invalid values are reset.

### P2-CACHE-005 — Conditional transport caching

Authenticated, non-live GET responses may use private conditional revalidation
(`ETag`/`Last-Modified`) where it reduces transfer cost. Responses must not be
public/shared-cacheable, and live attempt responses must not be served stale.

TASK-230 implements this boundary in the API middleware: normal reads use
`private, no-cache` with Express ETag revalidation, while auth, health, export,
attempt/live routes, and all non-read methods use `no-store`.

### P2-PERF-HTTP

Production text responses may use gzip/Brotli and keep-alive/HTTP2 capabilities
provided by the deployment edge. Downloads remain byte-correct.

TASK-231 enables thresholded compression for API text responses and applies a
65-second keep-alive, 66-second header, and 120-second request timeout policy.
The current repository has direct Docker service ports and no checked-in reverse
proxy; an edge may add Brotli/HTTP2 later without changing the API's private
cache boundary.

### P2-PERF-API

List responses are bounded and use purpose-specific DTOs. Core Prisma queries
avoid N+1 access and have justified indexes. Route bundles do not eagerly load
unrelated heavy editor/import code. Virtualization is used only where measured
large-list rendering cost justifies it.

TASK-232's collection DTO and pagination decisions are recorded in
`docs/performance/api-payload-audit.md`.

TASK-234's measured route bundle table and dynamic import decisions are recorded
in `docs/performance/bundle-audit.md`.

TASK-235's large-list benchmark and no-virtualization decision are recorded in
`docs/performance/virtualization-decision.md`.

## 3. Learning productivity requirements

### P2-LEARN-RECENT

The system keeps a bounded recent/resume list for accessed flashcard sets and
exams/attempts. Deleted or invalid content is excluded, and Dashboard plus
Android expose useful resume actions where the client supports them. No large
event-log infrastructure is introduced.

TASK-240 implements this requirement with the bounded projection and access
signals documented in `docs/learning/recent-resume.md`.

### P2-LEARN-FAVORITES

Flashcard sets and exams may be marked/unmarked as favorites. Reads can filter by
favorite, mutations are idempotent, soft-deleted content is excluded, and no
multi-user/social permission model is introduced.

TASK-241 implements this requirement as a bounded aggregate flag; client and API
behavior are recorded in `docs/learning/favorites.md`.

### P2-LEARN-TAGS

Sets and exams may have a bounded collection of flat, normalized tags. Tag
filtering and management are available through the API and Web; Android displays
and filters tags where practical. Tags are not hierarchical and cannot grow
without bounds.

TASK-242 implements this requirement with shared normalized tags, additive
join-table migration, bounded CRUD/assignment/filter endpoints, Web editor and
filters, and Android display/filter support. Detailed behavior is recorded in
`docs/learning/tags.md`.

## 4. Spaced repetition requirements

### P2-FSRS-001 — Server-authoritative FSRS

FSRS is the approved Phase 2 scheduling algorithm. The server owns per-card
scheduling state and review logs. Ratings are exactly `AGAIN`, `HARD`, `GOOD`, and
`EASY`. The scheduler is deterministic for the same state, rating, and server
review time.

### P2-FSRS-002 — Review state

Each card has bounded scheduling fields sufficient for due/new/review state,
interval, ease/stability, and next due time. Review logs retain bounded audit data.
The API exposes bounded due/new counts and a small due queue. Duplicate review
submissions are idempotent and cannot apply two transitions.

### P2-FSRS-003 — Client review modes

Web and Android can complete due/new reviews with reveal plus Again/Hard/Good/Easy
ratings. The active queue is small and bounded. Basic Study All/Shuffle remains
available. Deleted or materially invalid cards leave review queues safely.

TASK-252 delivers the Web flow with Dashboard/navigation entry points, a maximum
20-card active batch, bounded next-card prefetch, in-place progress/completion,
and server-submitted ratings. TASK-253 delivers the equivalent Android flow
through a Compose destination, the same four ratings, bounded in-memory active
queue, and retry-safe client request ids. Both clients preserve Study All/Shuffle.

### P2-FSRS-004 — Timezone boundary

Scheduling timestamps are stored in UTC. Due comparisons use server time and a
documented user timezone boundary; V1's single logical user defaults to UTC unless
configuration explicitly supplies another IANA timezone.

The field-level transition, edit/delete behavior, review-log retention, queue
bound, and additive migration are defined in
[`docs/learning/fsrs-scheduling.md`](learning/fsrs-scheduling.md) and ADR-026.

## 5. Exam review requirements

### P2-EXAM-REVIEW-001

Submitted attempts may produce a bounded wrong-answer queue containing incorrect
or unanswered question references plus the exam content version. It never changes
official scoring, never reveals answers before submission, and invalid references
are removed after deletion/version changes.

### P2-EXAM-REVIEW-002

Incorrect-only practice is clearly labeled practice/review, uses only submitted
mistakes, and cannot create or overwrite an official exam best result.

Implementation boundary: `ExamMistake` is unique per exam/content-version/
question and the API clamps the queue and practice selection to 20. Normal
submission derives incorrect and unanswered rows transactionally from the
immutable snapshot. The practice snapshot is the only place that carries
correctness metadata before grading; `LiveExamAttemptDto` remains sanitized.

## 6. Import/search requirements

### P2-SEARCH-RESPONSIVE

Global search preserves Japanese Unicode behavior, uses safe relevance ordering
and snippets, debounces/cancels Web and Android requests, and maintains a bounded
short-lived recent-query cache.

Implementation boundary: the API ranks each bounded result group by exact,
prefix, and substring matches; Web uses a 300 ms query-key debounce with
AbortSignal and a maximum of 30 memory-only search keys; Android uses the same
debounce/cancellation interval with a maximum of five recent queries retained
for two minutes. Both UIs highlight matches through escaped text rendering.

### P2-IMPORT-MULTI

Web may preview multiple Markdown files with bounded concurrency, but each file
still follows independent preview → confirm → transaction semantics. One file's
failure does not partially consume another file, and duplicate confirmation remains
impossible.

Implementation boundary: both flashcard and exam Web import modals accept a
maximum of 20 .md/.txt files, preview them sequentially, show per-file status,
and require independent confirmation. The original paste/single-file path is
unchanged.

## 7. Android read-cache requirements

### P2-ANDROID-CACHE

Android may use a bounded Room read cache for set summaries, exam summaries,
recent/resume metadata, and optionally small flashcard details. It shows cached
data with an explicit stale/offline state and refreshes from the server. It does
not cache pre-grading correctness metadata, grow without expiry/row limits, or
implement full offline synchronization.

Implementation boundary: the current client caches only summary projections and
dashboard/recent metadata, caps bounded projections at 100 rows, removes rows
older than seven days before reads, and treats all writes as best-effort. Active
attempts, answer keys, FSRS state, and pending mutations remain network/server
owned.

## 8. Operations and observability requirements

### P2-OPS-TRANSPORT

Production transport policy must match the actual deployment. If HTTPS is not
available for the current IP-only personal deployment, the accepted risk is
documented and the system must not claim secure-cookie guarantees that do not hold.

### P2-OPS-UPDATE

Production updates use one documented guarded command/script that applies safe
migrations, updates containers, checks health, stops on failure, never deletes DB
volumes, and preserves rollback guidance.

### P2-OPS-BACKUP

Daily backups, retention, outside-volume storage, and isolated restore are verified
after Phase 2 migrations, including Phase 2 tables/data.

### P2-OPS-OBS

Normal server logs provide request duration, slow-request, safe failed-login,
import, submission, and health signals without logging secrets, tokens, full
imported content, or answer keys.

## 9. Deferred boundary

Phase 2 does not add social sharing, multiple users, AI generation, OCR, reading or
listening UI, full offline synchronization, push notifications, or enterprise
infrastructure. Any future addition requires a new approved requirement.

## 10. Phase 2 delivery record

The implementation work through TASK-312 is committed. This record identifies the
delivered capability and its evidence while TASK-320 remains the final release
gate; it does not replace the task checklist. The 2026-08-27 release-gate audit
also refreshed the dependency tree to patched Nest/Next, bcrypt, Multer, and
transitive package lines, removed committed authentication fallbacks, and added
an authenticated conditional-cache smoke check.

| Requirement group                                              | Delivered implementation                                                                                                                                       | Verification/evidence                                                                                                                                                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-PERF-BASELINE, P2-CACHE-001..005, P2-PERF-HTTP, P2-PERF-API | Web QueryClient cache, invalidation, live-attempt freshness boundary, UI preferences, conditional API caching, compression, DTO/query and bundle optimizations | `docs/performance/phase2-baseline.md`, `cache-storage-policy.md`, `navigation-audit.md`, `http-cache-policy.md`, `api-payload-audit.md`, `bundle-audit.md`, `virtualization-decision.md`, TASK-300/TASK-301 evidence |
| P2-SESSION                                                     | Current bearer/localStorage strategy, minimal preference allow-list, explicit cookie deferral                                                                  | `docs/security/web-auth-session-audit.md`, `docs/performance/ui-preferences.md`, TASK-300 evidence                                                                                                                   |
| P2-LEARN-RECENT                                                | Bounded recent/resume projection and Dashboard/client resume actions                                                                                           | `docs/learning/recent-resume.md`, migration/integration and Web/Android journey evidence                                                                                                                             |
| P2-LEARN-FAVORITES                                             | Idempotent favorite flags, filtering, and client controls                                                                                                      | `docs/learning/favorites.md`, migration/integration and Web/Android journey evidence                                                                                                                                 |
| P2-LEARN-TAGS                                                  | Normalized flat tags, bounded assignments, filters, and editor/display support                                                                                 | `docs/learning/tags.md`, migration/integration and Web/Android journey evidence                                                                                                                                      |
| P2-FSRS-001..004                                               | Server-authoritative UTC scheduling, four ratings, bounded queue/log retention, retry-safe request IDs, Web and Android review flows                           | `docs/learning/fsrs-scheduling.md`, `docs/testing/phase2-integration-2026-08-27.md`, `docs/testing/phase2-web-e2e-2026-08-27.md`, `docs/testing/phase2-android-e2e-2026-08-27.md`                                    |
| P2-EXAM-REVIEW-001..002                                        | Version-bound wrong-answer queue, sanitized review response, isolated untimed practice, official-result exclusion                                              | Web, API integration, and Android journey evidence named above; live-attempt contract remains sanitized                                                                                                              |
| P2-SEARCH-RESPONSIVE, P2-IMPORT-MULTI                          | Unicode-safe ranked search with cancellation/bounded caches and sequential independent multi-file preview/confirmation                                         | Web/API integration evidence and `docs/testing/phase2-web-e2e-2026-08-27.md`                                                                                                                                         |
| P2-ANDROID-CACHE                                               | Room summary/resume projection with 100-row/seven-day bounds, stale state, and no mutation queue                                                               | `docs/02_ARCHITECTURE.md`, `docs/03_DATABASE.md`, `docs/testing/phase2-android-e2e-2026-08-27.md`                                                                                                                    |
| P2-OPS-TRANSPORT, P2-OPS-UPDATE, P2-OPS-BACKUP, P2-OPS-OBS     | Actual transport audit, guarded update script, isolated restore verifier, request/slow/error/health signals                                                    | `docs/security/production-transport-audit.md`, `docs/operations/backup-restore-2026-08-27.md`, `docs/09_DEPLOYMENT.md`, `docs/performance/http-transport.md`                                                         |

## 11. Deferred and owner-gated Phase 2 items

These boundaries are intentional and must remain visible at release review:

| Item                                                     | Current status                                                                                                | Required condition before implementation or release claim                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| TASK-221 secure Web cookie migration                     | Deferred                                                                                                      | Owner-approved HTTPS origin, CORS/credentials policy, CSRF design, and regression validation          |
| Domain/TLS/HSTS production edge                          | Owner-gated accepted-risk exception; current IP-only runtime is HTTP                                          | Owner supplies a domain/certificate endpoint and validates the reverse-proxy migration                |
| Daily remote backup scheduler and off-volume artifact    | Repository scripts and isolated local restore are verified; remote scheduler/artifact remain owner-controlled | Owner verifies scheduler, retention, off-volume destination, and a production-origin restore artifact |
| Production Android device validation and release signing | Local emulator production-URL build path is verified; physical-device access and signing key are external     | Owner supplies an authorized device and release-signing process, then records the result              |
| Brotli/HTTP2 reverse-proxy edge                          | Optional deployment optimization; direct API compression is implemented                                       | Only add after a real edge/topology requirement                                                       |

None of these deferred items is silently treated as complete. They are reviewed
explicitly by TASK-320 and, where applicable, recorded as external release gates.
