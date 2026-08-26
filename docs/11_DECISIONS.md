# 11 — Architecture / Product Decisions

This file records the approved V1 decisions and the later Phase 2 amendments so
agents do not repeatedly revisit settled choices. V1 entries are retained as the
regression baseline; Phase 2 entries supersede only the explicitly amended scope.

## ADR-001 — TypeScript for Web/API, Kotlin for Android

**Decision:** Use TypeScript for Web/API/shared Node packages and Kotlin for the
Android Native mobile client.

**Reason:** The Web/API benefit from the existing TypeScript contracts while Android
gets a production-native client with Compose, platform navigation, secure storage,
and Gradle tooling. The Android client consumes the existing REST contract rather
than sharing web UI code.

---

## ADR-002 — Modular monolith backend

**Decision:** NestJS modular monolith.

**Rejected:** Microservices.

**Reason:** V1 scale does not justify distributed complexity.

---

## ADR-003 — PostgreSQL + Prisma

**Decision:** PostgreSQL with Prisma migrations/ORM.

**Reason:** Strong relational integrity, predictable schema, good tooling.

---

## ADR-004 — Flashcard belongs to one set

**Decision:** One-to-many FlashcardSet → Flashcard.

**Rejected:** Many-to-many.

**Reason:** Simpler model and matches current content needs.

---

## ADR-005 — Exam folders use self-reference

**Decision:** One `exam_folders` table with `parent_id`.

**Rule:** Effective maximum depth is 2.

**Rejected:** Separate FolderLevel1 and FolderLevel2 tables.

---

## ADR-006 — Question type exists in V1

**Decision:** Every exam question has a type enum.

**V1 implemented type:** `MULTIPLE_CHOICE_SINGLE`.

**Reason:** Avoid destructive schema redesign for reading/listening later.

---

## ADR-007 — Answers hidden until grading

**Decision:** Live attempt API does not expose correctness metadata.

**Reason:** Exam integrity and clean trust boundary.

---

## ADR-008 — Markdown import is preview + confirm

**Decision:** Never persist directly from initial upload.

**Reason:** Better validation, safer UX, transactional integrity.

---

## ADR-009 — Answer key at end of exam Markdown

**Decision:** Correct answers appear only in final `# ANSWER KEY` section.

**Reason:** Opening source file should not immediately reveal answers.

---

## ADR-010 — Best result only as product behavior

**Decision:** UI/product retains and displays highest applicable score; lower complete historical results are not required.

**Reason:** User explicitly wants only highest result.

---

## ADR-011 — Exam content versioning

**Decision:** Content-affecting edits increment exam version; old best score no longer applies to new version.

**Reason:** Scores from different question content are not directly comparable.

---

## ADR-012 — Online-first mobile V1

**Historical V1 decision:** No full offline synchronization in V1. Phase 2 keeps
that boundary and adds only the bounded, non-authoritative Android Room read
projection described in ADR-028.

**Reason:** Sync conflict resolution would materially increase complexity.

---

## ADR-013 — No spaced repetition in V1

**Historical V1 decision:** Basic flashcard study only. This V1 scope decision is
superseded for the approved Phase 2 release by ADR-023 and ADR-026.

**Phase 2 status:** Server-authoritative FSRS is implemented with bounded,
idempotent review transitions; the V1 statement remains true only as historical
release scope.

---

## ADR-014 — Credentials configured on server

**Decision:** V1 uses server-configured account credentials; no registration.

**Security:** Prefer password hash in environment configuration.

---

## ADR-015 — Server authoritative timer

**Decision:** Attempt `expires_at` is server-generated; client displays countdown only.

---

## ADR-016 — Equal-weight scoring

**Decision:** All V1 questions have equal weight; score is correct/total × 100.

---

## ADR-017 — Soft deletion

**Decision:** Core user content uses soft deletion where practical.

---

## ADR-018 — No enterprise infrastructure by default

**Decision:** Do not add Kubernetes, message brokers, search clusters, or event sourcing without a new requirement.

---

## ADR-019 — Replace Expo mobile with Android Native

**Decision:** Replace the V1 React Native/Expo implementation with a single native
Android Kotlin application using Jetpack Compose, Material 3, Navigation Compose,
ViewModel, Coroutines/Flow, Retrofit/OkHttp, Hilt, DataStore, and Android Keystore.

**Reason:** The requested production target is Android Native. Removing the Node-based
mobile workspace avoids parallel runtimes and makes build-time API configuration,
secure persistence, timer restoration, and CI verification explicit.

**Compatibility:** Web, Backend, Database, and REST API contracts remain unchanged.
The current V1 mobile release is Android-only; iOS is a future separate client.

---

## ADR-020 — Separate local and production Android API variants

**Decision:** Keep the `debug` Android variant on the local API URL and provide an
installable `production` variant that embeds the production API URL at Gradle build
time. The production variant is used for owner/device validation; release signing
remains external and no signing key is committed.

**Reason:** On a physical Android device, `localhost` resolves to the device itself,
not the developer machine. A separate production variant prevents a downloaded APK
from accidentally targeting local development while preserving local development
behavior.

**Compatibility:** The REST API, Web client, Backend, and Database are unchanged.

## ADR-021 — Phase 2 remains a bounded online-first enhancement

**Decision:** Phase 2 keeps PostgreSQL/API as the source of truth and adds only
bounded in-memory Web query caching, small UI preferences, and selected Android
Room read caching. It does not introduce full offline synchronization or a second
authoritative content store.

**Reason:** Warm navigation and returning-user startup improve materially without
creating sync conflicts or weakening exam integrity.

## ADR-022 — TanStack Query for Web reads

**Decision:** Use TanStack Query as the single Web query/mutation cache with
centralized keys, explicit invalidation, short stale times, bounded garbage
collection, and freshness-first live attempts.

**Reason:** It provides request deduplication, cancellation, stale-while-revalidate,
and mutation invalidation without inventing a custom browser database.

## ADR-023 — FSRS is approved for Phase 2

**Decision:** Implement server-authoritative FSRS with Again/Hard/Good/Easy ratings,
deterministic scheduling, idempotent review submissions, UTC storage, and a
bounded review queue. Basic Study All/Shuffle remains separate.

**Reason:** Spaced repetition is the highest-value learning extension in the
approved Phase 2 scope while the rules remain testable and compact.

## ADR-024 — Web authentication remains bearer-token based for current topology

**Decision:** Keep the existing bearer token in `localStorage` for V1-compatible
Web/Android behavior until the current HTTP IP-only deployment can provide secure
cookie prerequisites and CSRF protection. Do not add an insecure cookie migration.

**Reason:** `HttpOnly` cookies without HTTPS/CSRF controls would create a misleading
security improvement. TASK-221 is explicitly deferred unless deployment changes.

## ADR-025 — Current production transport is HTTP with explicit risk

**Decision:** The current owner deployment remains HTTP on the documented IP/ports
until a domain/HTTPS edge is accepted. Production docs must state the risk, and
clients must not claim HTTPS or `Secure` cookie guarantees.

**Reason:** No domain or certificate authority was approved for this personal-use
deployment. The runtime must match reality rather than overstate security.

## ADR-026 — FSRS scheduling is server-authoritative and bounded

**Decision:** Store FSRS state and review logs on each flashcard, calculate every
transition from server UTC time, expose only the four bounded ratings, and make
review submission idempotent with `(flashcard_id, client_request_id)`. Keep the
review queue capped and prune review logs by both age and per-card count.

**Reason:** Scheduling must be deterministic across Web and Android clients,
safe to retry after network failures, and small enough to operate within the
existing PostgreSQL/API architecture.

**Compatibility:** Existing Study All/Shuffle behavior remains separate and
available. Existing cards migrate to `NEW` with an immediate due time.

## ADR-027 — Exam mistakes and practice are isolated from official results

**Decision:** Persist incorrect/unanswered references only when a normal exam
attempt is submitted. Expose a bounded sanitized queue, and create separate
untimed attempts with `is_practice=true` for incorrect-only practice. Practice
results are graded for feedback but never update official best results or create
new mistake rows.

**Reason:** Focused remediation must not change authoritative exam history or
leak answer keys before a practice submission.

## ADR-028 — Android cache is a bounded, non-authoritative read projection

**Decision:** Use Room only for small list/dashboard summaries and recent/resume
metadata. Rows expire after seven days and bounded projections are trimmed to
100 rows. Cached data may render immediately with an explicit stale/offline
state, then is replaced by server data. No active attempts, answer keys, FSRS
state, or mutation queue is stored locally.

**Reason:** A small read cache improves returning-user startup without creating
an offline synchronization system or a second source of truth.

## ADR-029 — Search uses bounded client cancellation and deterministic ranking

**Decision:** Keep PostgreSQL text search for the personal-scale dataset, rank
returned candidates by exact/prefix/substring match with stable recency/id
tie-breakers, and bound each result group to 30 items. Web uses a 300 ms
debounced TanStack Query keyed by normalized query, passes AbortSignal, and
keeps at most 30 memory-only search keys. Android uses a 300 ms debounced
ViewModel job with cancellation and a five-entry, two-minute in-memory cache.
Both clients render matched snippets as normal text nodes.

**Reason:** This removes typing request storms and stale-result races while
preserving Japanese Unicode and avoiding unsafe HTML highlighting.

## ADR-030 — Multi-file import is sequential preview with independent confirmation

**Decision:** The Web picker may accept at most 20 Markdown-compatible files.
Preview requests run with concurrency one and retain a separate short-lived
server import token/status for each file. Confirmation is per file and guarded
against duplicate clicks. A failure affects only that file; the existing
single-file preview/confirm flow is preserved.

**Reason:** Batch selection reduces repetitive file-picker work without
weakening the preview-before-persist or transactional import invariants.

## ADR-031 — IP-only production remains HTTP until a domain is accepted

**Decision:** Keep the current Web/API/Android HTTP URLs aligned with the
observed IP-only deployment and document the transport risk. The simplest
upgrade path is a Caddy TLS edge backed by an owner-approved domain; no domain,
certificate, Secure cookie, or client URL migration is assumed before that
approval and deployment validation.

**Reason:** A self-signed or invented certificate would not give the personal
deployment a trustworthy client transport. Runtime documentation must describe
what is actually reachable.
