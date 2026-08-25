# 11 — Architecture / Product Decisions

This file records approved V1 decisions so agents do not repeatedly revisit settled choices.

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

**Decision:** No full offline synchronization in V1.

**Reason:** Sync conflict resolution would materially increase complexity.

---

## ADR-013 — No spaced repetition in V1

**Decision:** Basic flashcard study only.

**Future:** FSRS may be added as V1.1/Phase 2.

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
