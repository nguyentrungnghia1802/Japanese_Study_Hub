# Project Task Plan — Japanese Learning System — Phase 3 Extensions

> File: `tasks/task.md`
>
> **HARD START GATE:** Do not execute any TASK-401+ until `tasks/task-01.md` Phase 2 is 100% complete, including TASK-320 and TASK-321.
>
> Follow `Agent.md` for every task. Stop on failures, fix root cause, add regression tests, update docs, commit completed work, then continue.
>
> Phase 3 goals:
>
> 1. Add a first-class Japanese ↔ Vietnamese Lookup module for Web and Android.
> 2. Add kanji details and optional Japanese/Vietnamese examples through documented providers.
> 3. Preserve Flashcard and submitted-Exam review state when temporarily visiting Lookup.
> 4. Block normal in-app Lookup navigation while an exam attempt is still in progress.
> 5. Retain detailed wrong/unanswered review data for only the 3 most recent official exam attempts.
> 6. Turn lookup results and mistakes into Flashcards.
> 7. Keep all provider caches, history, browser state, and DB retention bounded.

---

# Phase 3A — Gate, requirements, and provider selection

## TASK-400 — Verify Phase 2 completion

- [x] Confirm all mandatory `tasks/task-01.md` checkboxes are complete.
- [x] Confirm TASK-320 passed.
- [x] Confirm TASK-321 passed.
- [x] Confirm Phase 2 release/tag/commit is recorded (`v2.0.0`, commit `81b4d2e`).
- [x] Confirm production Web/API/PostgreSQL/Android are healthy (production
      owner confirmation plus live Web/API health probes).
- [x] Confirm latest backup/restore verification succeeded (production owner
      confirmation plus the recorded local isolated restore).
- [x] Confirm no critical/high bug remains (local gates and pushed CI passed).
- [x] If any item fails, STOP and return to `tasks/task-01.md`; do not start TASK-401+.

Acceptance criteria:

- Phase 3 starts only from a fully released Phase 2 baseline.

Verification (2026-08-27):

- [x] `tasks/task-01.md` contains no unchecked Phase 2 item.
- [x] Phase 2 release commit `81b4d2e` and annotated tag `v2.0.0` exist locally
      and on `origin`.
- [x] Production probes returned HTTP 200 for API `/health`, API
      `/health/ready` with database `ok`, and the Web root.
- [x] Production backup/restore and Android production validation were
      owner-confirmed; external logs, backup artifacts, and signed APK evidence
      remain outside the repository.

---

## TASK-401 — Establish Phase 3 source of truth

- [x] Add approved Phase 3 requirements to `docs/14_PHASE3_REQUIREMENTS.md`.
- [x] Add requirement groups for Lookup, history/favorites, continuity, last-3 mistakes, and Flashcard creation from Lookup/mistakes.
- [x] Update `docs/11_DECISIONS.md`.
- [x] Update `docs/02_ARCHITECTURE.md`.
- [x] Update `docs/12_TRACEABILITY.md`.
- [x] Update `Agent.md` to permit the approved Phase 3 scope.
- [x] Preserve all V1/Phase 2 security and server-authority invariants.
- [x] Explicitly document that Phase 3 does not introduce a full offline dictionary, AI translation, OCR, handwriting recognition, or exam cheating assistance.

Acceptance criteria:

- No Phase 3 behavior is implemented without a documented requirement/decision.

Verification (2026-08-27):

- [x] `docs/14_PHASE3_REQUIREMENTS.md` defines the approved scope, requirement
      IDs, exclusions, security/storage boundaries, and delivery mapping.
- [x] Decisions, architecture, traceability, README, and Agent scope are
      synchronized with the active Phase 3 plan.

Commit: `docs: establish phase 3 requirements`

---

## TASK-402 — Evaluate dictionary providers with real smoke tests

Primary candidates:

- `dict.minhqnd.com` for Japanese/Vietnamese dictionary meaning data.
- `kanjiapi.dev` for single-kanji metadata.
- Official Tatoeba API v1 for optional Japanese/Vietnamese example sentences.

Rules:

- Do not scrape undocumented private endpoints.
- Do not depend directly on provider response shapes in Web/Android.
- External providers must be called through the Japanese Study Hub backend.

Checklist:

- [ ] Test Japanese kanji word → Vietnamese meaning.
- [ ] Test kana word → Vietnamese meaning.
- [ ] Test common Japanese compound → Vietnamese meaning.
- [ ] Test Vietnamese word → Japanese result.
- [ ] Test suggestion/autocomplete behavior.
- [ ] Verify timeout/rate-limit behavior.
- [ ] Verify licensing and attribution requirements.
- [ ] Test single-kanji detail through `kanjiapi.dev`.
- [ ] Verify on-yomi, kun-yomi, stroke count, JLPT/grade/frequency availability.
- [ ] Test Tatoeba API v1 for Japanese sentences with Vietnamese translations.
- [ ] Verify Tatoeba attribution/license requirements.
- [ ] Define provider fallback behavior.
- [ ] If Vietnamese → Japanese quality is insufficient, choose the least-complex documented/licensed fallback through the backend provider abstraction; do not fake reverse translation.
- [ ] Document selected providers and exact usage.

Acceptance criteria:

- Both required lookup directions have a verified path.
- Kanji detail has a verified path.
- Optional examples have a verified path.
- Provider/license risks are documented.

Commit: `research(dictionary): select lookup providers`

---

## TASK-403 — Define normalized Dictionary contracts

- [ ] Define lookup direction enum: `AUTO | JA_TO_VI | VI_TO_JA`.
- [ ] Define request fields: query, direction, limit, optional examples.
- [ ] Define normalized word result:
  - written form;
  - reading;
  - Vietnamese meanings;
  - part of speech when available;
  - common/frequency hint when available;
  - attribution/source.
- [ ] Define normalized kanji result:
  - character;
  - on-yomi;
  - kun-yomi;
  - Vietnamese meaning when available;
  - stroke count;
  - JLPT;
  - grade/frequency when trustworthy;
  - bounded related words.
- [ ] Define normalized example result:
  - Japanese sentence;
  - Vietnamese translation;
  - attribution/source.
- [ ] Define stable error codes for invalid query, no result, timeout, unavailable provider, and rate limit.
- [ ] Keep raw provider payload internal.
- [ ] Add TypeScript contracts for Web/API.
- [ ] Add equivalent Kotlin DTO/domain mapping for Android.

Acceptance criteria:

- A provider can be replaced without rewriting client UI contracts.

Commit: `feat(dictionary): define lookup contracts`

---

## TASK-404 — Define bounded cache/history policy

- [ ] Use a bounded backend cache for normalized lookup responses.
- [ ] Prefer existing Phase 2 cache infrastructure; otherwise use a small in-process LRU/TTL cache.
- [ ] Do not add Redis only for dictionary lookup.
- [ ] Suggested success TTL: 12–24 hours.
- [ ] Suggested kanji TTL: up to 24 hours or longer if justified.
- [ ] Suggested example TTL: 6–12 hours.
- [ ] Suggested no-result TTL: 1–5 minutes.
- [ ] Do not cache provider failures long-term.
- [ ] Bound max cache entry count.
- [ ] Normalize cache keys for Unicode/whitespace/direction.
- [ ] Keep lookup history separate from response cache.
- [ ] Limit lookup history to 100 recent items per logical user.
- [ ] Do not store full provider payloads in history.
- [ ] Document attribution requirements and cache bypass/debug behavior.

Acceptance criteria:

- Dictionary-related storage cannot grow without bound.

Commit: `docs(dictionary): define cache and retention`

---

# Phase 3B — Dictionary backend

## TASK-410 — Implement provider abstraction

- [ ] Add backend dictionary/lookup module.
- [ ] Define interfaces for lookup, suggestions, kanji enrichment, and examples.
- [ ] Add strict request timeout.
- [ ] Add safe transient retry behavior.
- [ ] Do not aggressively retry rate limits.
- [ ] Normalize provider responses.
- [ ] Validate all external JSON at the boundary.
- [ ] Add safe error mapping.
- [ ] Add safe structured logs without huge payloads.
- [ ] Add unit tests with mocked providers.

Acceptance criteria:

- Web/Android never call external dictionary APIs directly.

Commit: `feat(dictionary): add provider abstraction`

---

## TASK-411 — Implement Japanese ↔ Vietnamese lookup

- [ ] Implement direction auto-detection.
- [ ] Japanese scripts/kanji default to JA_TO_VI.
- [ ] Vietnamese/Latin input defaults to VI_TO_JA when appropriate.
- [ ] Allow explicit direction override.
- [ ] Normalize Unicode safely.
- [ ] Preserve Vietnamese diacritics.
- [ ] Implement Japanese → Vietnamese.
- [ ] Implement Vietnamese → Japanese using the verified provider path.
- [ ] Return multiple ranked results where applicable.
- [ ] Bound result count.
- [ ] Handle no-result as a normal domain outcome.
- [ ] Integrate bounded cache.
- [ ] Implement verified fallback only when needed.
- [ ] Add tests for Japanese, kana, compound, Vietnamese, invalid input, no result, timeout, and provider failure.

Acceptance criteria:

- Both lookup directions work through one stable project API contract.

Commit: `feat(dictionary): implement bidirectional lookup`

---

## TASK-412 — Implement single-kanji enrichment

- [ ] Detect a valid single-kanji query.
- [ ] Fetch approved kanji metadata.
- [ ] Return on-yomi.
- [ ] Return kun-yomi.
- [ ] Return stroke count.
- [ ] Return JLPT/grade/frequency only when provider data is trustworthy.
- [ ] Merge Vietnamese meaning from the primary dictionary result when available.
- [ ] Do not present English-only metadata as Vietnamese meaning.
- [ ] Return a bounded related-word list.
- [ ] Cache safely.
- [ ] Degrade gracefully if kanji enrichment provider fails.

Acceptance criteria:

- Single-kanji lookup is richer but never makes base lookup fragile.

Commit: `feat(dictionary): add kanji enrichment`

---

## TASK-413 — Add optional Japanese/Vietnamese examples

- [ ] Integrate official Tatoeba API v1 or approved equivalent.
- [ ] Search examples relevant to the term.
- [ ] Prefer Japanese sentences with Vietnamese translations.
- [ ] Return at most 3–5 examples.
- [ ] Do not block primary lookup if examples are slow/unavailable.
- [ ] Add bounded cache.
- [ ] Add source attribution.
- [ ] Sanitize rendered text.
- [ ] Add timeout/fallback tests.

Acceptance criteria:

- Examples improve Lookup but cannot break core lookup.

Commit: `feat(dictionary): add example sentences`

---

## TASK-414 — Expose project Lookup API

Recommended routes may be adapted to existing conventions:

- `GET /api/v1/lookup`
- `GET /api/v1/lookup/suggest`
- optional dedicated kanji route
- history/favorites routes in later tasks.

- [ ] Add authenticated lookup endpoint.
- [ ] Validate query/direction/limit.
- [ ] Add suggestions endpoint.
- [ ] Add provider-cost-aware rate limiting.
- [ ] Use project error envelope.
- [ ] Hide provider internals.
- [ ] Update OpenAPI.
- [ ] Add integration tests.

Acceptance criteria:

- Web/Android need only Japanese Study Hub API.

Commit: `feat(api): expose dictionary lookup`

---

# Phase 3C — Lookup history and favorites

## TASK-420 — Add bounded lookup history

- [ ] Persist history server-side so Web/Android share it.
- [ ] Store only compact metadata: query, direction, selected primary label if useful, timestamp.
- [ ] Do not store full provider responses.
- [ ] Limit to 100 recent items per logical user.
- [ ] Automatically prune older entries.
- [ ] Deduplicate repeated adjacent/same-query entries where sensible.
- [ ] Add history list API.
- [ ] Add clear-history API.
- [ ] Add migration if needed.
- [ ] Add retention tests.

Acceptance criteria:

- History is cross-device and predictably bounded.

Commit: `feat(dictionary): add bounded lookup history`

---

## TASK-421 — Add dictionary favorites

- [ ] Add compact favorite model.
- [ ] Store term, reading, Vietnamese meaning summary, direction/source metadata needed to reopen lookup.
- [ ] Do not persist full provider payload.
- [ ] Add favorite/unfavorite endpoints.
- [ ] Add list endpoint.
- [ ] Prevent obvious duplicates.
- [ ] Paginate/bound the list.
- [ ] Add migration and tests.

Acceptance criteria:

- User can save useful terms without immediately creating a Flashcard.

Commit: `feat(dictionary): add lookup favorites`

---

# Phase 3D — Web Lookup

## TASK-430 — Add Lookup as primary Web navigation

- [ ] Add `Tra cứu` / `Lookup` beside Dashboard, Flashcards, Exams, Search.
- [ ] Create dedicated Lookup route.
- [ ] Keep App Router navigation; no full document reload.
- [ ] Add query input.
- [ ] Add AUTO/JA→VI/VI→JA direction control.
- [ ] Add debounced suggestions.
- [ ] Add loading/no-result/provider-error/retry states.
- [ ] Add attribution.
- [ ] Optimize for repeated keyboard use.
- [ ] Verify Japanese/Vietnamese typography.

Acceptance criteria:

- Lookup is a first-class module, not an external redirect.

Commit: `feat(web): add lookup module`

---

## TASK-431 — Build Web word/kanji result UI

- [ ] Show written form prominently.
- [ ] Show reading.
- [ ] Show Vietnamese meanings.
- [ ] Show part of speech when available.
- [ ] Show kanji readings/strokes/JLPT/grade/frequency for single kanji.
- [ ] Show bounded related words.
- [ ] Show optional examples.
- [ ] Show source attribution.
- [ ] Add Copy.
- [ ] Add Favorite.
- [ ] Add “Add to Flashcard”.
- [ ] Make responsive.

Acceptance criteria:

- Vocabulary and single-kanji results each have appropriate presentation.

Commit: `feat(web): build lookup results`

---

## TASK-432 — Add Web history/favorites

- [ ] Show recent history.
- [ ] Limit initial visible entries.
- [ ] Add clear-history confirmation.
- [ ] Show favorites.
- [ ] Clicking history/favorite reruns/reopens Lookup.
- [ ] Handle stale/obsolete results gracefully.
- [ ] Avoid loading large history payloads on every page.

Commit: `feat(web): add lookup history and favorites`

---

## TASK-433 — Add Quick Lookup shortcut

- [ ] Add lightweight `Ctrl+K` or `/` shortcut when not conflicting with inputs.
- [ ] Open/focus a compact lookup action or navigate to Lookup.
- [ ] Preserve current page as return target.
- [ ] Support Escape/cancel.
- [ ] Keep accessible.
- [ ] Do not build a heavy generic command palette.

Commit: `feat(web): add quick lookup shortcut`

---

# Phase 3E — Lookup → Flashcard

## TASK-440 — Add “Add to Flashcard” from Lookup

- [ ] Let user select target Flashcard Set.
- [ ] Prefill sensible content.
- [ ] Default Front: Japanese written form + reading.
- [ ] Default Back: Vietnamese meaning + optional short example.
- [ ] For VI→JA lookup, keep Japanese as the learnable side by default.
- [ ] Allow editing before save.
- [ ] Do not silently create a new set.
- [ ] Reuse existing Flashcard create API.
- [ ] Preserve Markdown safety.
- [ ] Invalidate/update Phase 2 caches correctly.
- [ ] Add tests.

Acceptance criteria:

- Useful dictionary result can become a Flashcard without manual copy/paste.

Commit: `feat(flashcards): create cards from lookup`

---

# Phase 3F — Cross-page learning continuity

## TASK-450 — Define compact continuity state

Flashcard state:

- set ID;
- active study session metadata;
- ordered card IDs or reproducible shuffle state;
- current card ID/index;
- Front/Back side;
- progress;
- shuffle mode.

Submitted Exam review state:

- attempt ID;
- exam ID/version;
- current review question;
- review filter;
- scroll/list position when useful.

Checklist:

- [ ] Use URL state + bounded in-memory/session metadata where appropriate.
- [ ] Do not persist huge API payloads.
- [ ] Keep authoritative content on server/Phase 2 query cache.
- [ ] Define expiry/cleanup.
- [ ] Define browser refresh and Back/Forward behavior.

Acceptance criteria:

- Continuity behavior is explicit before UI implementation.

Commit: `docs(ux): define lookup continuity state`

---

## TASK-451 — Preserve Flashcard study state around Lookup on Web

- [ ] Allow Lookup while studying Flashcards.
- [ ] Preserve current card.
- [ ] Preserve Front/Back side.
- [ ] Preserve shuffle order/session.
- [ ] Preserve progress.
- [ ] Preserve safe `returnTo`.
- [ ] Return to exact prior study position.
- [ ] Avoid unnecessary refetch on warm return.
- [ ] Recover safely if underlying set/card changed/deleted.
- [ ] Clear invalid/expired continuity state.

Mandatory tests:

- [ ] Normal order.
- [ ] Shuffle order.
- [ ] Front/Back.
- [ ] Changed/deleted card fallback.

Acceptance criteria:

- `Flashcard → Lookup → Back` restores the exact study state.

Commit: `feat(web): preserve flashcard lookup continuity`

---

## TASK-452 — Block Lookup during active Exam attempts

Owner rule:

> Lookup is only allowed from Exam after the exam is finished and the user is reviewing submitted answers/mistakes.

- [ ] Detect `IN_PROGRESS` attempt state.
- [ ] Hide/disable Lookup navigation while taking an exam.
- [ ] Disable Quick Lookup during active attempt.
- [ ] Show a clear message for blocked in-app actions.
- [ ] Preserve server-backed attempt restore after accidental refresh/navigation.
- [ ] Do not attempt impossible browser-wide blocking of other tabs/sites.
- [ ] Do not change server-authoritative timer.
- [ ] Do not expose answers.
- [ ] Add regression tests.

Acceptance criteria:

- Normal in-app navigation cannot open Lookup from an unfinished exam.

Commit: `feat(exams): restrict lookup during active attempts`

---

## TASK-453 — Preserve submitted Exam review state around Lookup on Web

- [ ] Enable Lookup only after submission/finalization.
- [ ] Allow from full result review, wrong-answer review, and unanswered review.
- [ ] Preserve attempt ID.
- [ ] Preserve current review question.
- [ ] Preserve review filter.
- [ ] Preserve scroll/list position where practical.
- [ ] Return to exact prior review context.
- [ ] Use graded server data only.
- [ ] Handle missing/deleted attempt gracefully.

Acceptance criteria:

- `Submitted review → Lookup → Back` restores the same reviewed question/filter.

Commit: `feat(web): preserve exam review lookup continuity`

---

# Phase 3G — Android Lookup and continuity

## TASK-460 — Add Lookup to Android

- [ ] Add Lookup to Compose navigation.
- [ ] Add query input.
- [ ] Support AUTO/JA→VI/VI→JA.
- [ ] Add debounced suggestions.
- [ ] Render vocabulary result.
- [ ] Render kanji detail.
- [ ] Render examples.
- [ ] Add loading/no-result/error/retry.
- [ ] Show attribution.
- [ ] Call only project backend APIs.

Acceptance criteria:

- Android has the same core Lookup capability as Web.

Commit: `feat(android): add lookup module`

---

## TASK-461 — Add Android history/favorites/Add-to-Flashcard

- [ ] Show bounded shared lookup history.
- [ ] Add clear-history.
- [ ] Add dictionary favorites.
- [ ] Add Add-to-Flashcard.
- [ ] Reuse server persistence.
- [ ] Integrate with existing Android cache only where safe.
- [ ] Do not mirror the entire external dictionary into Room.

Commit: `feat(android): complete lookup productivity features`

---

## TASK-462 — Preserve Android Flashcard continuity around Lookup

- [ ] Preserve current card.
- [ ] Preserve Front/Back.
- [ ] Preserve shuffle order.
- [ ] Preserve progress.
- [ ] Navigate to Lookup and return.
- [ ] Survive normal configuration changes.
- [ ] Keep saved state compact.
- [ ] Recover safely after underlying data changes.

Acceptance criteria:

- Android `Flashcard → Lookup → Back` restores exact study state.

Commit: `feat(android): preserve flashcard lookup continuity`

---

## TASK-463 — Restrict active Exam Lookup and preserve submitted review on Android

- [ ] Hide/disable Lookup while exam is in progress.
- [ ] Preserve normal server-backed attempt restoration.
- [ ] Enable Lookup after submission.
- [ ] Preserve current submitted review question/filter.
- [ ] Restore exact review state after Lookup.
- [ ] Preserve timer and no-answer-leakage invariants.

Acceptance criteria:

- Android behavior matches Web.

Commit: `feat(android): preserve exam lookup continuity`

---

# Phase 3H — Last 3 wrong official attempts

## TASK-470 — Define exact retention semantics

Owner requirement:

> Save wrong-answer data from exam attempts and retain only the 3 most recent official attempts.

Rules to encode:

- [ ] Scope retention by logical user + exam + exam content version.
- [ ] Count only official submitted exam attempts.
- [ ] Do not count Phase 2 practice/incorrect-only sessions.
- [ ] Retain detailed wrong/unanswered review data for the newest 3 official attempts.
- [ ] On the 4th official attempt, prune detailed review data for the oldest retained attempt in the same scope.
- [ ] Keep best-score summary independent from this retention window.
- [ ] Keep overall attempt count/summary metadata if already part of product behavior.
- [ ] Do not mix old and current exam content versions.
- [ ] Treat unanswered questions as reviewable mistakes.
- [ ] Define ordering by server `submitted_at`.
- [ ] Define exact snapshot fields needed for historically correct review.
- [ ] Decide/document whether old-version last-3 data stays accessible historically or only current version is surfaced.

Acceptance criteria:

- “Last 3” has one deterministic server-side meaning.
- Best-result semantics remain unchanged.

Commit: `docs(exams): define last three mistake retention`

---

## TASK-471 — Add stable wrong-answer review snapshot storage

- [ ] Inspect Phase 2 mistake-review implementation first.
- [ ] Reuse/extend existing schema instead of creating duplicate parallel models.
- [ ] Add a new Prisma migration only if needed.
- [ ] Never edit applied migrations.
- [ ] Store enough graded data to remain accurate after future content changes.
- [ ] For each wrong/unanswered retained item, preserve as needed:
  - question ID;
  - question content snapshot or version-safe reference;
  - ordered option snapshot if required;
  - selected option;
  - correct option;
  - correctness/unanswered state;
  - question position.
- [ ] Avoid retaining unnecessary correct-question detail.
- [ ] Add indexes for recent-attempt review/pruning.
- [ ] Verify storage stays bounded by the last-3 policy.
- [ ] Test Phase 2 → Phase 3 migration.
- [ ] Test fresh DB migration.

Acceptance criteria:

- Retained wrong-answer review remains historically correct and bounded.

Commit: `feat(db): add bounded exam mistake retention`

---

## TASK-472 — Implement transactional last-3 pruning

- [ ] Integrate pruning into official attempt finalization or equivalent safe transaction.
- [ ] Identify newest 3 official submitted attempts in scope.
- [ ] Preserve detailed wrong/unanswered review data for those 3.
- [ ] Prune detailed review data older than 3.
- [ ] Never delete best-result summary.
- [ ] Never prune in-progress attempt.
- [ ] Never count practice attempt.
- [ ] Keep duplicate/idempotent submit safe.
- [ ] Handle retry/concurrency safely.

Mandatory tests:

- [ ] Attempt 1 retained.
- [ ] Attempt 2 retained.
- [ ] Attempt 3 retained.
- [ ] Attempt 4 prunes attempt 1 detailed review.
- [ ] Attempt 5 prunes attempt 2 detailed review.
- [ ] Practice attempt does not shift window.
- [ ] Another exam is unaffected.
- [ ] Another exam version is not mixed.
- [ ] Duplicate submit does not corrupt/prune twice.
- [ ] Best score remains correct.

Acceptance criteria:

- Exactly the intended 3 recent official mistake histories remain.

Commit: `feat(exams): retain last three mistake attempts`

---

## TASK-473 — Add Last-3 Mistake Review API

Recommended routes may be adapted to existing Phase 2 API:

- `GET /api/v1/exams/{examId}/mistake-attempts`
- `GET /api/v1/exam-attempts/{attemptId}/mistakes`
- optional aggregate endpoint for frequent mistakes.

- [ ] Return at most 3 retained attempt summaries, newest first.
- [ ] Include submitted time, score, correct/total, and version.
- [ ] Return only wrong/unanswered review items for selected retained attempt.
- [ ] Include correct answer data only because the attempt is already submitted.
- [ ] Enforce auth.
- [ ] Enforce version/history policy.
- [ ] Bound result size.
- [ ] Add frequent-mistake aggregate across retained attempts.
- [ ] Keep best-result API unchanged.
- [ ] Update OpenAPI.
- [ ] Add integration tests.

Acceptance criteria:

- Web/Android can render the required history using stable server data.

Commit: `feat(api): expose recent mistake attempts`

---

# Phase 3I — Wrong-answer review UX

## TASK-480 — Add Web “3 lần gần nhất” review

- [ ] Add Mistakes/Review area for an exam.
- [ ] Show newest, second newest, third newest retained attempt.
- [ ] Hide nonexistent attempt tabs.
- [ ] Show attempt date/time and score.
- [ ] Show wrong questions.
- [ ] Show unanswered questions.
- [ ] Show selected wrong option.
- [ ] Show correct option.
- [ ] Use labels/icons as well as color.
- [ ] Add Lookup action per review item.
- [ ] Preserve continuity around Lookup.
- [ ] Add “Add to Flashcard”.
- [ ] Add loading/empty/error states.

Acceptance criteria:

- User can inspect exactly the retained 3 official mistake histories.

Commit: `feat(web): add last three mistake review`

---

## TASK-481 — Add frequent-mistake summary

- [ ] Aggregate mistakes across the retained applicable attempts.
- [ ] Rank by frequency.
- [ ] Display `1/3`, `2/3`, `3/3` or correct denominator when fewer attempts exist.
- [ ] Never aggregate across exam content versions.
- [ ] Allow opening the question.
- [ ] Allow Lookup.
- [ ] Allow Add to Flashcard.
- [ ] Keep UI lightweight; no heavy analytics/charts.

Acceptance criteria:

- Repeated weak questions are easy to identify.

Commit: `feat(exams): summarize frequent mistakes`

---

## TASK-482 — Add Android last-3 mistake review

- [ ] Show retained attempt selector/list.
- [ ] Show wrong/unanswered review items.
- [ ] Show selected/correct answer state.
- [ ] Add Lookup.
- [ ] Preserve review state around Lookup.
- [ ] Add Add-to-Flashcard.
- [ ] Show frequent-mistake summary if shared API supports it.
- [ ] Add loading/empty/error states.

Acceptance criteria:

- Android and Web share the same retention semantics.

Commit: `feat(android): add last three mistake review`

---

# Phase 3J — Mistake → Flashcard

## TASK-490 — Add “Create Flashcard from Mistake”

- [ ] Add action from wrong/unanswered review item.
- [ ] Let user select target Flashcard Set.
- [ ] Prefill editable content.
- [ ] Recommended Front: question/prompt context.
- [ ] Recommended Back: correct answer + concise context.
- [ ] Optionally include selected wrong answer.
- [ ] Avoid noisy auto-generated cards containing unnecessary option lists.
- [ ] Preserve Markdown safety.
- [ ] Reuse existing Flashcard API.
- [ ] Invalidate/update relevant Web/Android caches.
- [ ] Add tests.
- [ ] Do not add fuzzy duplicate infrastructure unless a simple reliable check already exists.

Acceptance criteria:

- Mistakes can become study material with minimal manual work.

Commit: `feat(flashcards): create cards from exam mistakes`

---

# Phase 3K — Provider resilience and bounded storage

## TASK-500 — Harden provider boundaries

- [ ] Add strict timeouts.
- [ ] Add only lightweight failure suppression/circuit behavior if repeated failures justify it.
- [ ] Allow kanji/examples enrichment to fail independently from core lookup.
- [ ] Rate-limit project Lookup endpoints.
- [ ] Validate external response shape/size.
- [ ] Treat malformed provider data as untrusted.
- [ ] Sanitize displayed definitions/examples.
- [ ] Never expose provider/server internals.
- [ ] Honor Retry-After/rate-limit metadata where available.
- [ ] Add regression tests for provider timeout and malformed data.

Acceptance criteria:

- External dictionary downtime cannot destabilize the learning app.

Commit: `security(dictionary): harden provider boundaries`

---

## TASK-501 — Verify all Phase 3 storage is bounded

- [ ] Exercise many unique lookups.
- [ ] Verify lookup cache max entry count.
- [ ] Verify expired cache entries are collectible.
- [ ] Verify history stops at configured cap.
- [ ] Verify cookies contain no dictionary/learning payload.
- [ ] Verify browser local/session storage stays small.
- [ ] Verify Android cache does not become a full dictionary mirror.
- [ ] Verify last-3 mistake storage stays bounded after many attempts.
- [ ] Document measured storage behavior.

Acceptance criteria:

- Phase 3 satisfies the owner requirement of useful but moderate caching/storage.

Commit: `test(storage): verify phase 3 cache bounds`

---

# Phase 3L — Automated tests

## TASK-510 — Dictionary unit test completion

- [ ] Direction auto-detection.
- [ ] Japanese Unicode normalization.
- [ ] Vietnamese diacritic preservation.
- [ ] Empty/invalid query.
- [ ] Provider normalization.
- [ ] Provider timeout mapping.
- [ ] Rate-limit mapping.
- [ ] No-result behavior.
- [ ] Single-kanji detection.
- [ ] Kanji normalization.
- [ ] Cache key normalization.
- [ ] Cache TTL/max-size behavior.

Commit: `test(dictionary): add unit coverage`

---

## TASK-511 — Dictionary integration test completion

- [ ] Lookup endpoint success.
- [ ] Japanese → Vietnamese.
- [ ] Vietnamese → Japanese.
- [ ] Suggestions.
- [ ] Kanji enrichment.
- [ ] Examples graceful failure.
- [ ] Auth protection.
- [ ] Rate limit.
- [ ] History cap and clear.
- [ ] Favorite/unfavorite.
- [ ] Provider unavailable safe response.
- [ ] Attribution/source metadata.

Commit: `test(dictionary): add integration coverage`

---

## TASK-512 — Navigation continuity regression tests

Web:

- [ ] Flashcard normal session → Lookup → exact return.
- [ ] Flashcard shuffle session → Lookup → exact return.
- [ ] Front/Back state preserved.
- [ ] Active Exam blocks in-app Lookup.
- [ ] Submitted Exam review → Lookup → exact return question/filter.
- [ ] Browser Back behavior.
- [ ] Changed/deleted resource fallback.

Android:

- [ ] Same Flashcard continuity.
- [ ] Active Exam Lookup restriction.
- [ ] Submitted review continuity.

Commit: `test(ux): cover lookup continuity`

---

## TASK-513 — Last-3 retention test completion

- [ ] First three official attempts retained.
- [ ] Fourth prunes first detailed review.
- [ ] Fifth prunes second detailed review.
- [ ] Best score remains correct.
- [ ] Attempt count remains correct.
- [ ] Practice attempt excluded.
- [ ] Duplicate submit safe.
- [ ] Exam isolation.
- [ ] Version isolation.
- [ ] Unanswered retained as mistake.
- [ ] Snapshot review remains accurate.
- [ ] Fresh migration passes.
- [ ] Phase 2 → Phase 3 migration passes.

Commit: `test(exams): cover recent mistake retention`

---

## TASK-514 — Web Phase 3 E2E

- [ ] Login.
- [ ] Lookup Japanese → Vietnamese.
- [ ] Lookup Vietnamese → Japanese.
- [ ] Lookup single kanji.
- [ ] Favorite/unfavorite.
- [ ] History.
- [ ] Create Flashcard from Lookup.
- [ ] Flashcard → Lookup → exact return state.
- [ ] Start Exam.
- [ ] Verify Lookup disabled during active attempt.
- [ ] Submit Exam.
- [ ] Wrong-answer review → Lookup → exact return state.
- [ ] Complete enough official attempts to verify only latest 3 mistake histories remain.
- [ ] Create Flashcard from mistake.
- [ ] Verify no live answer leakage.

Commit: `test(web): complete phase 3 e2e`

---

## TASK-515 — Android Phase 3 smoke/E2E

- [ ] Login/session restore.
- [ ] Japanese → Vietnamese Lookup.
- [ ] Vietnamese → Japanese Lookup.
- [ ] Kanji detail.
- [ ] History/favorites.
- [ ] Add Lookup result to Flashcard.
- [ ] Flashcard → Lookup → exact return.
- [ ] Active Exam Lookup restriction.
- [ ] Submit Exam.
- [ ] Submitted review → Lookup → exact return.
- [ ] Last-3 mistake review.
- [ ] Add mistake to Flashcard.
- [ ] Provider failure/retry states.

Commit: `test(android): complete phase 3 smoke flow`

---

# Phase 3M — Documentation and attribution

## TASK-520 — Synchronize technical docs

- [ ] Update API docs for Lookup/history/favorites/mistakes.
- [ ] Update DB docs for new persistence.
- [ ] Update Architecture for provider adapters/cache/continuity.
- [ ] Update Security for external provider trust boundary.
- [ ] Update Testing docs.
- [ ] Update Development Guide.
- [ ] Update Deployment docs for new env vars if any.
- [ ] Update UI/UX docs.
- [ ] Update Decisions.
- [ ] Update Traceability.
- [ ] Ensure no undocumented provider API is used.

Commit: `docs: synchronize phase 3 technical documentation`

---

## TASK-521 — Verify provider attribution/licenses

- [ ] Verify dictionary provider attribution.
- [ ] Verify kanji provider attribution/license requirements.
- [ ] Verify Tatoeba attribution/license requirements.
- [ ] Add required links/source labels.
- [ ] Avoid copying provider branding/assets without permission.
- [ ] Record provider URLs and verification date.
- [ ] Document how maintainers can swap providers later.

Acceptance criteria:

- External data usage is transparent and license-compatible.

Commit: `docs(dictionary): finalize provider attribution`

---

# Phase 3N — Full release gate

## TASK-530 — Full Phase 3 validation

Build/test:

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

Database/operations:

- [ ] Fresh DB applies all migrations.
- [ ] Phase 2 DB upgrades to Phase 3.
- [ ] Backup taken before production migration.
- [ ] Isolated Phase 3 restore succeeds.
- [ ] Production health checks pass.

Dictionary:

- [ ] Production JA→VI works.
- [ ] Production VI→JA works.
- [ ] Production single-kanji works.
- [ ] Provider failure degrades safely.
- [ ] Cache bounded.
- [ ] History bounded.
- [ ] Attribution correct.

Continuity:

- [ ] Web Flashcard → Lookup → exact return.
- [ ] Android Flashcard → Lookup → exact return.
- [ ] Active Exam cannot open Lookup through normal in-app navigation.
- [ ] Active attempt still restores safely after refresh/reopen.
- [ ] Web submitted review → Lookup → exact return.
- [ ] Android submitted review → Lookup → exact return.

Last-3 mistakes:

- [ ] Only newest 3 official attempts retain detailed wrong/unanswered review in defined scope.
- [ ] Fourth attempt prunes oldest detailed review.
- [ ] Practice does not shift the window.
- [ ] Best score remains correct.
- [ ] Attempt count remains correct.
- [ ] Content versions do not mix.
- [ ] Frequent-mistake summary uses only retained applicable attempts.

Security/regression:

- [ ] Live attempt payload contains no correct-answer metadata.
- [ ] Server timer remains authoritative.
- [ ] Duplicate submit remains idempotent.
- [ ] Provider payload validated.
- [ ] No secrets exposed.
- [ ] No unbounded cache/storage introduced.
- [ ] Phase 2 features still pass regression.
- [ ] No critical/high bug remains.
- [ ] Docs match implementation.
- [ ] No mandatory Phase 3 checkbox remains unchecked.

If any item fails:

- [ ] STOP release.
- [ ] Reproduce.
- [ ] Fix root cause.
- [ ] Add regression test.
- [ ] Re-run affected checks.
- [ ] Re-run full Phase 3 validation.

Acceptance criteria:

- Every mandatory checklist item is green.

Commit: `chore: prepare phase 3 release`

---

## TASK-531 — Phase 3 production release and completion

- [ ] Tag/version Phase 3 release.
- [ ] Record deployed Web/API image information.
- [ ] Record Android APK/version.
- [ ] Apply Phase 3 migrations safely.
- [ ] Deploy production.
- [ ] Run health checks.
- [ ] Smoke-test production Lookup.
- [ ] Smoke-test production Flashcard continuity.
- [ ] Smoke-test production Exam review continuity.
- [ ] Verify last-3 retention using production-safe test data.
- [ ] Verify latest backup after deployment.
- [ ] Record final provider/attribution status.
- [ ] Archive completed `tasks/task.md` under release history.
- [ ] Confirm all mandatory checkboxes are complete.

Project may be declared **100% complete for Phase 3** only after TASK-531 is fully satisfied.

Commit: `chore: finalize phase 3 release`
