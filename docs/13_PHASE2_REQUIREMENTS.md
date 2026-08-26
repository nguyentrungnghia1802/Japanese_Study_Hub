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

## 3. Learning productivity requirements

### P2-LEARN-RECENT

The system keeps a bounded recent/resume list for accessed flashcard sets and
exams/attempts. Deleted or invalid content is excluded, and Dashboard plus
Android expose useful resume actions where the client supports them. No large
event-log infrastructure is introduced.

### P2-LEARN-FAVORITES

Flashcard sets and exams may be marked/unmarked as favorites. Reads can filter by
favorite, mutations are idempotent, soft-deleted content is excluded, and no
multi-user/social permission model is introduced.

### P2-LEARN-TAGS

Sets and exams may have a bounded collection of flat, normalized tags. Tag
filtering and management are available through the API and Web; Android displays
and filters tags where practical. Tags are not hierarchical and cannot grow
without bounds.

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

### P2-FSRS-004 — Timezone boundary

Scheduling timestamps are stored in UTC. Due comparisons use server time and a
documented user timezone boundary; V1's single logical user defaults to UTC unless
configuration explicitly supplies another IANA timezone.

## 5. Exam review requirements

### P2-EXAM-REVIEW-001

Submitted attempts may produce a bounded wrong-answer queue containing incorrect
or unanswered question references plus the exam content version. It never changes
official scoring, never reveals answers before submission, and invalid references
are removed after deletion/version changes.

### P2-EXAM-REVIEW-002

Incorrect-only practice is clearly labeled practice/review, uses only submitted
mistakes, and cannot create or overwrite an official exam best result.

## 6. Import/search requirements

### P2-SEARCH-RESPONSIVE

Global search preserves Japanese Unicode behavior, uses safe relevance ordering
and snippets, debounces/cancels Web and Android requests, and maintains a bounded
short-lived recent-query cache.

### P2-IMPORT-MULTI

Web may preview multiple Markdown files with bounded concurrency, but each file
still follows independent preview → confirm → transaction semantics. One file's
failure does not partially consume another file, and duplicate confirmation remains
impossible.

## 7. Android read-cache requirements

### P2-ANDROID-CACHE

Android may use a bounded Room read cache for set summaries, exam summaries,
recent/resume metadata, and optionally small flashcard details. It shows cached
data with an explicit stale/offline state and refreshes from the server. It does
not cache pre-grading correctness metadata, grow without expiry/row limits, or
implement full offline synchronization.

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
