# 14 — Phase 3 Requirements

Status: approved for implementation on 2026-08-27 after the Phase 2 release
`v2.0.0`. Phase 2 remains the regression baseline and the API/database remain
authoritative.

## 1. Scope

Phase 3 adds a first-class Japanese ↔ Vietnamese Lookup capability to Web and
Android, backed by provider adapters in the Japanese Study Hub API. It also
adds compact lookup history/favorites, cross-page learning continuity, bounded
retention of recent official exam mistakes, and conversion of lookup/mistake
items into editable Flashcards.

The implementation must remain a modular monolith using the existing REST API,
PostgreSQL, Prisma, Web query layer, and Android Compose architecture.

## 2. Lookup requirements

| ID            | Requirement                                                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3-LOOKUP-001 | Expose one authenticated project API for lookup, suggestions, and optional enrichment; Web and Android never call external providers directly.                                                            |
| P3-LOOKUP-002 | Support `AUTO`, `JA_TO_VI`, and `VI_TO_JA`; preserve Japanese Unicode and Vietnamese diacritics.                                                                                                          |
| P3-LOOKUP-003 | Normalize provider responses into stable project contracts containing written form, reading, Vietnamese meanings, optional part of speech/frequency hints, source attribution, and bounded result counts. |
| P3-LOOKUP-004 | Detect and enrich a valid single-kanji query with on-yomi, kun-yomi, stroke count, trustworthy JLPT/grade/frequency values, Vietnamese meaning when available, and bounded related words.                 |
| P3-LOOKUP-005 | Treat examples as optional enrichment. Return at most five Japanese/Vietnamese examples, sanitize text, attribute the source, and never fail the primary lookup because examples are unavailable.         |
| P3-LOOKUP-006 | Return typed stable errors for invalid input, no result, timeout, provider unavailability, and rate limiting without exposing provider internals.                                                         |
| P3-LOOKUP-007 | Keep raw provider payloads internal; validate external JSON shape and size at the adapter boundary.                                                                                                       |
| P3-LOOKUP-008 | Use documented, replaceable, attribution-compatible providers and a documented fallback policy; do not fake reverse translation.                                                                          |

## 3. Provider and cache requirements

| ID              | Requirement                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3-PROVIDER-001 | Provider calls use strict timeouts, safe transient retry only, and no aggressive retry of rate limits.                                                    |
| P3-PROVIDER-002 | Normalized lookup responses use a bounded in-process cache or existing cache infrastructure; no Redis or distributed cache is introduced only for Lookup. |
| P3-PROVIDER-003 | Cache keys normalize Unicode/whitespace/direction and distinguish lookup, suggestion, kanji, example, and no-result outcomes.                             |
| P3-PROVIDER-004 | Success, kanji, example, and no-result TTLs are documented and bounded; provider failures are not retained long-term.                                     |
| P3-PROVIDER-005 | Provider responses, definitions, and examples are treated as untrusted text and sanitized before rendering.                                               |

## 4. History and favorites

| ID               | Requirement                                                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3-HISTORY-001   | Persist compact lookup history server-side so Web and Android share it.                                                                            |
| P3-HISTORY-002   | Store at most 100 recent items per logical user, prune deterministically, and deduplicate repeated adjacent/same-query entries where appropriate.  |
| P3-HISTORY-003   | Store query, direction, selected primary label when useful, and timestamp only; never store the full provider payload in history.                  |
| P3-FAVORITES-001 | Persist compact dictionary favorites containing the term, reading, Vietnamese summary, direction, and source metadata needed to reopen the lookup. |
| P3-FAVORITES-002 | Favorite operations are authenticated, idempotent for obvious duplicates, paginated/bounded, and independent from Flashcard creation.              |

## 5. Learning continuity and exam restrictions

| ID                | Requirement                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3-CONTINUITY-001 | Preserve compact Flashcard study metadata: set, session/order or reproducible shuffle state, current card/index, side, progress, and shuffle mode. |
| P3-CONTINUITY-002 | Preserve compact submitted Exam review metadata: attempt, exam/version, current question, filter, and practical scroll/list position.              |
| P3-CONTINUITY-003 | Prefer URL state plus bounded in-memory/session metadata; authoritative content remains in the API/Phase 2 query cache.                            |
| P3-CONTINUITY-004 | Define expiry, cleanup, refresh, Back/Forward, missing-resource fallback, and no-large-payload behavior before implementation.                     |
| P3-EXAM-001       | Normal in-app Lookup navigation and Quick Lookup are unavailable while an exam attempt is `IN_PROGRESS`.                                           |
| P3-EXAM-002       | Lookup becomes available only after submission/finalization and may be opened from graded result, wrong-answer, or unanswered review.              |
| P3-EXAM-003       | Phase 3 cannot alter server-authoritative timer, attempt restoration, submitted immutability, scoring, or no-answer-leakage behavior.              |

## 6. Last-three official mistake retention

| ID             | Requirement                                                                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P3-MISTAKE-001 | Scope detailed retention by logical user, exam, and exam content version.                                                                                                                              |
| P3-MISTAKE-002 | Count only official submitted attempts; Phase 2 practice/incorrect-only sessions never shift the window.                                                                                               |
| P3-MISTAKE-003 | Retain detailed wrong and unanswered snapshots for exactly the three newest official attempts in scope, ordered by server `submitted_at`; prune older detail transactionally on official finalization. |
| P3-MISTAKE-004 | Preserve enough graded snapshot data for historically correct review after content changes, while avoiding unnecessary correct-question detail.                                                        |
| P3-MISTAKE-005 | Keep best-score summaries and overall attempt metadata independent from detailed mistake retention. Never mix exam versions or exams.                                                                  |
| P3-MISTAKE-006 | Duplicate submission, retries, and concurrent finalization are idempotent and cannot corrupt the retention window.                                                                                     |

## 7. Flashcard creation

| ID               | Requirement                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P3-FLASHCARD-001 | Allow an authenticated user to select an existing Flashcard Set and edit a prefilled card from a Lookup result or submitted mistake.                                           |
| P3-FLASHCARD-002 | Lookup defaults to Japanese written form plus reading on Front and Vietnamese meaning plus a short optional example on Back; VI→JA keeps Japanese as the learnable side.       |
| P3-FLASHCARD-003 | Mistake cards default to question/prompt context on Front and correct answer plus concise context on Back; selected wrong answer is optional and option-list noise is avoided. |
| P3-FLASHCARD-004 | Never silently create a set, reuse the existing safe Flashcard API, sanitize Markdown, and invalidate only affected Phase 2 caches.                                            |

## 8. Security, storage, and client parity

- Authentication, authorization, rate limiting, safe error envelopes, and
  source attribution apply to every Lookup/history/favorite endpoint.
- Cookies, localStorage/sessionStorage, Android Room, query caches, provider
  caches, history, and favorites remain bounded and contain no secrets, raw
  authorization headers, full provider payloads, or live exam answer keys.
- Correct answers are available only in already-submitted graded review data;
  live attempts remain sanitized and server-authoritative.
- Web and Android use the project API and share server persistence semantics;
  Android does not mirror an external dictionary into Room.

## 9. Explicit exclusions

Phase 3 does not introduce a full offline dictionary, AI translation, OCR,
handwriting recognition, reading/listening UI, social features, or exam-cheating
assistance. It does not attempt browser-wide blocking of other tabs/sites and
does not replace the server as the source of truth.

## 10. Delivery mapping

Provider selection and contracts are established by TASK-402–404, backend
adapters/API by TASK-410–414, history/favorites by TASK-420–421, Web behavior by
TASK-430–440, continuity by TASK-450–453 and TASK-460–463, retention by
TASK-470–473, TASK-480–482, and TASK-513, and release evidence by
TASK-500–531. Every implementation task must add tests and update dependent
technical documentation before its commit.
