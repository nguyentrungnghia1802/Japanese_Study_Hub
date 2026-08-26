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
          │ HTTPS REST                    │ HTTPS REST
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
├── task.md
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

V1 mobile is online-first.

Do not implement a bidirectional offline sync engine in V1.

The Android FSRS screen requests the server summary and a maximum 20-card due
queue through `StudyRepository`. It keeps only that active batch in the
ViewModel, sends ratings with a stable client request id for transient retries,
and never calculates or overwrites scheduling state locally. Basic Study
All/Shuffle remains a separate route and does not mutate FSRS state.

The Android client also has a small Room read cache for list summaries,
dashboard counts, and recent/resume metadata. It is online-first: cached data
may render immediately with a stale notice, then server data replaces it. Live
attempts, FSRS transitions, and pre-grading answer keys never enter this cache.

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
POST /exams/{id}/start
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
POST /exam-attempts/{id}/submit
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

Backend shall provide:

- Structured logs
- Request ID/correlation ID where feasible
- Health endpoint
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
