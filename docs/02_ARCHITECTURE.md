# 02 — System Architecture

## 1. Architecture goals

The architecture shall be simple enough for a personal learning product while preserving clear boundaries between clients, backend logic, persistence, and import parsing.

Primary goals:

- Server-side source of truth
- Shared API contracts
- Clear domain boundaries
- Low deployment complexity
- Safe exam execution
- Transactional imports
- Future extensibility

---

## 2. High-level topology

```text
┌─────────────────────┐       ┌─────────────────────┐
│      Web App        │       │     Mobile App      │
│ Next.js / React     │       │ Kotlin/Compose      │
└─────────┬───────────┘       └──────────┬──────────┘
          │ REST (HTTP exception; HTTPS target) │ REST (HTTP exception; HTTPS target)
          └──────────────┬────────────────┘
                         ▼
                ┌───────────────────┐
                │   Backend API     │
                │ NestJS/TypeScript │
                └───────┬───────────┘
                        │ Prisma
                        ▼
                ┌───────────────────┐
                │   PostgreSQL      │
                └───────────────────┘
                        │
                        └── optional media/object storage
```

---

## 3. Monorepo structure

Recommended layout:

```text
japanese-learning/
├── apps/
│   ├── web/
│   ├── mobile/
│   └── api/
├── packages/
│   ├── contracts/
│   ├── shared/
│   ├── config/
│   └── tooling/
├── docs/
├── docker/
├── Agent.md
├── tasks/
│   ├── task-01.md
│   └── task.md
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

`apps/mobile` is an Android Gradle project rather than a pnpm workspace package.
Its native source is organized under `app/src/main/java` by `core`, `data`, and
feature modules; it has no React Native, Expo, or Node runtime dependency.

### Shared packages

`packages/contracts` may contain:

- API request/response types
- Shared enums
- Validation-compatible schemas where appropriate

`packages/shared` may contain:

- Pure utility code
- Formatting functions
- Common constants

Avoid sharing backend database models directly into frontend code.

---

## 4. Backend modules

Recommended NestJS modules:

```text
src/
├── auth/
├── flashcards/
│   ├── sets/
│   └── cards/
├── exams/
│   ├── folders/
│   ├── questions/
│   ├── attempts/
│   └── results/
├── imports/
│   ├── flashcards/
│   └── exams/
├── review/
│   ├── fsrs.ts
│   ├── review.controller.ts
│   └── review.service.ts
├── exam-review/
│   ├── exam-review.controller.ts
│   └── exam-review.service.ts
├── exports/
├── search/
├── media/
├── health/
├── prisma/
└── common/
```

Rules:

- Controllers handle transport concerns.
- Services implement application/domain use cases.
- Repositories/Prisma access stays out of UI clients.
- Parsers are isolated from persistence.
- Exam scoring is a pure/testable domain service.
- FSRS transitions are a pure/testable domain operation; review persistence,
  idempotency, and retention remain in the review application service.
- Authentication logic is isolated.
- `exam-review` owns the bounded wrong-answer queue and starts isolated
  practice attempts; `attempts` remains the only scoring boundary.

---

## 5. Web architecture

Recommended Next.js responsibilities:

- Routing and page composition
- Authentication state handling
- API consumption
- Form validation for UX
- Markdown rendering through a safe renderer
- Exam timer display based on server-provided timestamps

The web app shall not:

- Connect directly to PostgreSQL
- Contain server secrets
- Determine authoritative scoring
- Store correct answers before submission

Current Phase 2 implementation uses one application-level TanStack Query
`QueryClient`. Dashboard, lists, details, and search use centralized keys,
bounded stale/garbage-collection windows, abortable reads, and explicit mutation
invalidation. Live attempts use a separate freshness-first policy with no
long-lived persistence. The cache is in memory only; the exact values and storage
allow-list are defined in `docs/performance/cache-storage-policy.md`.

---

## 6. Mobile architecture

Android Native Kotlin/Compose responsibilities:

- Authentication state
- Retrofit/OkHttp API consumption through a repository
- Navigation Compose and Material 3 UI
- ViewModel state backed by Coroutines + Flow
- Flashcard study interaction
- Server-authoritative FSRS review interaction through a bounded ViewModel queue
- Exam interaction
- Encrypted token persistence using Android Keystore + DataStore
- Active-attempt restoration using DataStore

The V1 mobile client was online-first. Phase 2 keeps that boundary and adds a
bounded, non-authoritative Room read projection for summaries and recent/resume
metadata. It does not add a bidirectional offline sync engine or a local write
authority.

The Android FSRS screen requests the server summary and a maximum 20-card due
queue through `StudyRepository`. It keeps only that active batch in the
ViewModel, sends ratings with a stable client request id for transient retries,
and never calculates or overwrites scheduling state locally. Basic Study
All/Shuffle remains a separate route and does not mutate FSRS state.

The Android client also has a small Room read cache for list summaries,
dashboard counts, and recent/resume metadata. It is online-first: cached data
may render immediately with a stale notice, then server data replaces it. The
projection is capped at 100 summary rows and seven days; live attempts, FSRS
transitions, pending mutations, and pre-grading answer keys never enter it.

---

## 7. Authentication flow

```text
Client
  │ POST /auth/login
  ▼
API validates configured username + password hash
  │
  ├─ invalid → generic 401
  │
  └─ valid → token/session
                │
                ▼
        Client stores auth state securely
```

The exact token strategy may be short-lived access token plus refresh strategy or a sufficiently secure server session. The implementation must follow `07_SECURITY.md`.

---

## 8. Flashcard import flow

```text
Upload .md
   │
   ▼
File validation
   │
   ▼
Markdown parser
   │
   ▼
Normalized import DTO
   │
   ▼
Domain validation
   │
   ▼
Preview response
   │
   ▼ user confirms
Import confirmation endpoint
   │
   ▼
Single DB transaction
   │
   ├─ success → set + cards created
   └─ failure → rollback
```

Preview must not create persistent domain data.

---

## 9. Exam import flow

Same two-step pattern:

1. Preview
2. Confirm

The confirm request should carry either:

- A short-lived server-side import token referencing the validated parsed payload, or
- The exact payload plus a validation hash/version and server-side revalidation

Preferred design: server-side temporary import session/token with expiration to prevent client tampering and duplicate import.

The Web batch picker accepts at most 20 Markdown-compatible files and runs
preview calls sequentially. Each file keeps its own preview token, status, and
confirm action; a failed preview or confirmation does not consume or roll back
another file. The existing single-file textarea/file flow remains unchanged.

---

## 10. Exam start flow

```text
POST /exams/{id}/attempts
        │
        ▼
Validate exam exists/current
        │
        ▼
Create attempt with exam_version
        │
        ├─ started_at
        ├─ expires_at if timed
        └─ randomized order snapshot if enabled
        │
        ▼
Return questions/options WITHOUT correctness flags
```

If shuffling is enabled, order must remain stable for that attempt.

---

## 11. Exam submission flow

```text
Client answers
   │
POST /attempts/{id}/submit
   │
   ▼
Server checks attempt state/time
   │
   ▼
Server loads authoritative answer key
   │
   ▼
Score calculation
   │
   ▼
Atomic attempt finalization
   │
   ▼
Best-result compare/update
   │
   ▼
Return graded result + correct answers
```

Submission must be idempotent: repeated identical submit requests must not create multiple graded attempts.

---

## 12. Timer architecture

Server time is authoritative.

Attempt stores:

- `started_at`
- `expires_at` nullable
- `submitted_at` nullable

Client renders:

`expires_at - current time`

Refresh shall retrieve existing attempt state or reopen it through a dedicated endpoint.

Client clock manipulation must not extend server expiration.

---

## 13. Best-result architecture

Best result should be keyed by:

- User identity scope
- Exam ID
- Exam version

V1 may use a single logical configured user identity, but the schema should avoid blocking a future `user_id` migration.

Update policy:

- New score > best: replace best metrics
- New score < best: do not replace score
- New score = best: keep configured tie behavior

---

## 14. Exam versioning

Every exam has a content version integer starting at 1.

Metadata-only changes do not increment version.

Content-affecting edits increment version atomically with the edit.

Attempts retain the version they were created against.

Best result displayed for the current exam shall match current version.

---

## 15. Folder depth enforcement

Folder model uses `parent_id`.

Backend rules:

- Root folder depth = 1
- Child folder depth = 2
- Depth 3 creation/move is rejected

A move operation must validate the entire moved subtree.

---

## 16. Search architecture

Initial implementation may use PostgreSQL indexed case-insensitive/Unicode-aware text search appropriate for personal scale.

Avoid introducing Elasticsearch/OpenSearch in V1.

Search service should expose bounded result sets and search domains:

- Flashcard sets
- Flashcards
- Exams
- Folders

Results use deterministic personal-scale relevance: exact and prefix matches
rank before substring matches, then updatedAt and id provide stable
tie-breaking. Web search waits 300 ms after input, passes the query abort signal
to the API, and keeps at most 30 memory-only recent query keys with a 20-second
stale window and two-minute garbage-collection window. Android uses the same
300 ms debounce/cancellation boundary and a five-entry, two-minute in-memory
recent-query cache. Matched text is rendered through React/Compose text
components; raw HTML is never injected.

---

## 17. Media architecture

V1 primarily stores text.

For optional cover/icon uploads:

- Store file outside PostgreSQL when practical
- Store metadata/path/reference in DB
- Validate type/size

Future listening audio should use the same abstraction.

---

## 18. Configuration architecture

Use environment variables for runtime secrets/configuration.

Recommended categories:

- App environment
- API port/base URL
- Database URL
- Auth username
- Auth password hash
- Token/session secret
- CORS origins
- Upload limits
- Logging level
- Storage config

Provide `.env.example` with placeholder values only.

---

## 19. Observability

The current backend provides:

- Structured request logs containing method, route template, status, duration,
  and request ID
- Slow-request and safe failed-login/import/exam-submit signals
- Public liveness at `/health` and database readiness at `/health/ready`
- Startup configuration validation

Optional future integrations:

- Error tracking
- Metrics
- Tracing

---

## 20. Architectural non-goals

Do not introduce without a demonstrated requirement:

- Microservices
- Event streaming platform
- Kubernetes
- CQRS/event sourcing
- GraphQL
- Distributed cache cluster
- Search cluster
- Complex message broker

A modular monolith is the preferred V1 backend.

---

## 21. Phase 3 Lookup architecture

Lookup remains inside the API modular monolith. A `dictionary` module owns the
project contracts, request validation, provider interfaces, adapters, bounded
TTL cache, attribution, safe error mapping, and rate limiting. External
dictionary/example services are never called by Web or Android and their raw
payloads never cross the module boundary.

The API returns normalized word, kanji, example, suggestion, history, and
favorite DTOs. Provider adapters validate response shape and size, apply strict
timeouts and lightweight transient retry, then discard unnecessary fields. A
provider failure may remove optional kanji/examples enrichment without failing a
valid core lookup.

The shared provider HTTP client enforces a 2.5-second timeout, a 256 KiB
response limit, at most one transient retry, no retry for HTTP 429, and a
bounded per-provider failure circuit (three consecutive timeout/availability
failures open a five-second cooldown). Retry-After and X-RateLimit-Reset are
bounded before they reach the typed response. Nest receives default client
options through an explicit module token so production bootstrap and injected
test clients use the same boundary.

Lookup history and favorites are compact PostgreSQL records scoped to the
logical user. History is capped at 100 entries and is separate from the
response cache. The response cache is bounded by entry count and TTL; failures
are not retained long-term. Android may cache only the small active project
responses permitted by the existing Room policy and never mirrors a provider
dictionary.

## 22. Phase 3 continuity and exam boundary

Web and Android preserve only compact navigation metadata when leaving a
Flashcard study session or submitted Exam review. URL parameters identify the
return context; bounded in-memory/session state carries order, current item,
side, filter, and progress. The server/query cache remains authoritative for
content and graded data. Missing/deleted resources clear invalid state and fall
back to a safe list/detail screen.

The active exam state is checked before exposing Lookup navigation or Quick
Lookup. An `IN_PROGRESS` attempt blocks normal in-app Lookup; a submitted
attempt may open Lookup from graded review and return to the same review
question/filter. This is a client navigation rule and does not alter the
server-authoritative timer, attempt restoration, scoring, or live answer
sanitization.

On Android, leaving Flashcard Study keeps the ViewModel/SavedStateHandle order,
index, Front/Back side, and shuffle mode on the navigation back stack; the
Lookup route receives only a bounded initial query. Submitted exam review uses
the same back-stack return pattern and never places graded payloads in the
Lookup route arguments.

## 23. Phase 3 mistake retention

Official finalization writes version-bound wrong/unanswered snapshots and
transactionally prunes detailed snapshots outside the newest three attempts in
the same user/exam/version scope. Practice attempts never enter the window.
Snapshots contain only the fields needed for submitted review, including
question/option context, selected/correct state, and position. Best-score
summary rows and overall attempt metadata are not pruned by this policy.

### Phase 3 bounded Lookup cache

Lookup provider responses are normalized at the API boundary and kept in the
bounded process-local TTL/LRU described in
[`docs/dictionary/cache-policy.md`](dictionary/cache-policy.md). The cache is
not authoritative, is separate from history/favorites, and is never used for
live exam state or answer-bearing data.

## 24. Phase 3 cross-page continuity

Web Flashcard study continuity is a per-tab `sessionStorage` record keyed by
set ID. It contains only a session ID, a bounded ordered list of card IDs, the
current index/card ID, Front/Back state, completion/progress, shuffle mode, a
safe return path, and timestamps. The record is capped at 500 card IDs and
expires after 30 minutes. On return, the current server/query-cache set is
projected onto the saved order only when the complete card ID set still
matches; otherwise the record is cleared and the current set order is used.

Submitted exam review continuity is keyed by attempt ID and contains only
exam/version, current question ID, filter, scroll position, safe return path,
and timestamps. It never stores question content, selected answers, or correct
answers. The review route reloads the immutable graded result from
`GET /attempts/{attemptId}/result`; missing or non-submitted attempts render a
safe unavailable state.

The active exam Lookup gate is a bounded, per-tab marker. A pending start
marker expires after two minutes and an active attempt marker is cleared when
the server reports finalization. This marker controls only in-app navigation;
it does not claim to block other browser tabs/sites and does not modify the
server timer or attempt state.
