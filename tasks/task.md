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

- [x] Test Japanese kanji word → Vietnamese meaning.
- [x] Test kana word → Vietnamese meaning.
- [x] Test common Japanese compound → Vietnamese meaning.
- [x] Test Vietnamese word → Japanese result.
- [x] Test suggestion/autocomplete behavior.
- [x] Verify timeout/rate-limit behavior policy at the provider boundary; live throttling was not induced against public services.
- [x] Verify licensing and attribution requirements.
- [x] Test single-kanji detail through `kanjiapi.dev`.
- [x] Verify on-yomi, kun-yomi, stroke count, JLPT/grade/frequency availability.
- [x] Test Tatoeba API v1 for Japanese sentences with Vietnamese translations.
- [x] Verify Tatoeba attribution/license requirements.
- [x] Define provider fallback behavior.
- [x] If Vietnamese → Japanese quality is insufficient, choose the least-complex documented/licensed fallback through the backend provider abstraction; do not fake reverse translation.
- [x] Document selected providers and exact usage.

Acceptance criteria:

- Both required lookup directions have a verified path.
- Kanji detail has a verified path.
- Optional examples have a verified path.
- Provider/license risks are documented.

Verification (2026-08-27):

- [x] Real smoke results and exact requests are recorded in
      `docs/dictionary/provider-evaluation-2026-08-27.md`.
- [x] `dict.minhqnd.com` verified JA → VI, VI → JA samples, and suggestions;
      documented coverage gaps map to `NO_RESULT`.
- [x] `kanjiapi.dev` verified single-kanji readings, stroke count, grade/JLPT,
      and frequency fields; English glosses are not relabeled as Vietnamese.
- [x] Tatoeba v1 returned Japanese/Vietnamese pairs and per-item license/owner
      metadata; examples remain optional enrichment.
- [x] The documented Vietnamese Wiktionary API fallback is limited to explicit
      Japanese translation templates and is selected only when the primary
      provider has no usable VI → JA result.
- [x] Strict timeout, 429 no-retry, transient retry, response-size, and
      boundary-test requirements are recorded for TASK-410; no public-provider
      flood was used to manufacture a rate-limit response.

Commit: `research(dictionary): select lookup providers`

---

## TASK-403 — Define normalized Dictionary contracts

- [x] Define lookup direction enum: `AUTO | JA_TO_VI | VI_TO_JA`.
- [x] Define request fields: query, direction, limit, optional examples.
- [x] Define normalized word result:
  - written form;
  - reading;
  - Vietnamese meanings;
  - part of speech when available;
  - common/frequency hint when available;
  - attribution/source.
- [x] Define normalized kanji result:
  - character;
  - on-yomi;
  - kun-yomi;
  - Vietnamese meaning when available;
  - stroke count;
  - JLPT;
  - grade/frequency when trustworthy;
  - bounded related words.
- [x] Define normalized example result:
  - Japanese sentence;
  - Vietnamese translation;
  - attribution/source.
- [x] Define stable error codes for invalid query, no result, timeout, unavailable provider, and rate limit.
- [x] Keep raw provider payload internal.
- [x] Add TypeScript contracts for Web/API.
- [x] Add equivalent Kotlin DTO/domain mapping for Android.

Acceptance criteria:

- A provider can be replaced without rewriting client UI contracts.

Verification (2026-08-27):

- [x] Shared TypeScript contracts and bounded constants are in
      `packages/contracts/src/dictionary.dto.ts` and exported from the package.
- [x] API-facing contract documentation is in
      `docs/dictionary/contracts.md`; raw provider payloads are explicitly
      excluded.
- [x] Android transport DTOs, domain models, and defensive bounded mapper are
      implemented with Unicode/diacritic and oversized-response regression
      tests in `DictionaryMapperTest.kt`.
- [x] Contract shape is provider-neutral; attribution and stable dictionary
      error codes are the only provider-related metadata exposed.

Commit: `feat(dictionary): define lookup contracts`

---

## TASK-404 — Define bounded cache/history policy

- [x] Use a bounded backend cache for normalized lookup responses.
- [x] Prefer existing Phase 2 cache infrastructure; otherwise use a small in-process LRU/TTL cache.
- [x] Do not add Redis only for dictionary lookup.
- [x] Suggested success TTL: 12–24 hours.
- [x] Suggested kanji TTL: up to 24 hours or longer if justified.
- [x] Suggested example TTL: 6–12 hours.
- [x] Suggested no-result TTL: 1–5 minutes.
- [x] Do not cache provider failures long-term.
- [x] Bound max cache entry count.
- [x] Normalize cache keys for Unicode/whitespace/direction.
- [x] Keep lookup history separate from response cache.
- [x] Limit lookup history to 100 recent items per logical user.
- [x] Do not store full provider payloads in history.
- [x] Document attribution requirements and cache bypass/debug behavior.

Acceptance criteria:

- Dictionary-related storage cannot grow without bound.

Verification (2026-08-27):

- [x] `TtlLruCache` is bounded at 256 entries, expires by TTL, refreshes LRU
      order, and has deterministic clock-injected tests.
- [x] Lookup/kanji/example/suggestion TTLs, no-result TTL, key normalization,
      no-failure-cache behavior, history separation, and attribution policy are
      documented in `docs/dictionary/cache-policy.md`.
- [x] Existing Phase 2 Web/Android caches remain unchanged; no Redis or new
      distributed cache dependency was introduced.

Commit: `docs(dictionary): define cache and retention`

---

# Phase 3B — Dictionary backend

## TASK-410 — Implement provider abstraction

- [x] Add backend dictionary/lookup module.
- [x] Define interfaces for lookup, suggestions, kanji enrichment, and examples.
- [x] Add strict request timeout.
- [x] Add safe transient retry behavior.
- [x] Do not aggressively retry rate limits.
- [x] Normalize provider responses.
- [x] Validate all external JSON at the boundary.
- [x] Add safe error mapping.
- [x] Add safe structured logs without huge payloads.
- [x] Add unit tests with mocked providers.

Acceptance criteria:

- Web/Android never call external dictionary APIs directly.

Verification (2026-08-27):

- [x] `DictionaryModule` is API-owned and is the only registered boundary for
      dictionary, Wiktionary, kanji, and Tatoeba providers.
- [x] `ProviderHttpClient` enforces a 2.5-second timeout, 256 KiB body bound,
      one transient retry, and no retry for 429/other non-transient 4xx.
- [x] Adapter tests cover normalized JA→VI/VI→JA data, explicit Wiktionary
      fallback templates, kanji metadata without English-as-Vietnamese leaks,
      Tatoeba attribution, malformed/oversized bodies, timeout, 5xx retry, and
      429 mapping.
- [x] Logs contain provider/code/attempt metadata only; query text, payloads,
      authorization material, and provider URLs with query values are not logged.

Commit: `feat(dictionary): add provider abstraction`

---

## TASK-411 — Implement Japanese ↔ Vietnamese lookup

- [x] Implement direction auto-detection.
- [x] Japanese scripts/kanji default to JA_TO_VI.
- [x] Vietnamese/Latin input defaults to VI_TO_JA when appropriate.
- [x] Allow explicit direction override.
- [x] Normalize Unicode safely.
- [x] Preserve Vietnamese diacritics.
- [x] Implement Japanese → Vietnamese.
- [x] Implement Vietnamese → Japanese using the verified provider path.
- [x] Return multiple ranked results where applicable.
- [x] Bound result count.
- [x] Handle no-result as a normal domain outcome.
- [x] Integrate bounded cache.
- [x] Implement verified fallback only when needed.
- [x] Add tests for Japanese, kana, compound, Vietnamese, invalid input, no result, timeout, and provider failure.

Acceptance criteria:

- Both lookup directions work through one stable project API contract.

Verification (2026-08-27):

- [x] `DictionaryLookupService` resolves Japanese scripts to `JA_TO_VI`, Latin
      Vietnamese input to `VI_TO_JA`, and honors explicit direction overrides.
- [x] NFKC/whitespace normalization preserves Japanese Unicode and Vietnamese
      diacritics; invalid and oversized input uses `INVALID_QUERY`.
- [x] Lookup results are ranked and capped at the shared 20-result bound.
- [x] Vietnamese Wiktionary is called only after an empty primary VI→JA result;
      no-result is cached briefly and returned as typed `NO_RESULT`.
- [x] Service tests cover Japanese/kana/compound behavior, Vietnamese input,
      fallback, ranking/bounds, invalid/no-result, and cache reuse. Provider
      timeout/failure mappings remain covered by TASK-410 boundary tests.

Commit: `feat(dictionary): implement bidirectional lookup`

---

## TASK-412 — Implement single-kanji enrichment

- [x] Detect a valid single-kanji query.
- [x] Fetch approved kanji metadata.
- [x] Return on-yomi.
- [x] Return kun-yomi.
- [x] Return stroke count.
- [x] Return JLPT/grade/frequency only when provider data is trustworthy.
- [x] Merge Vietnamese meaning from the primary dictionary result when available.
- [x] Do not present English-only metadata as Vietnamese meaning.
- [x] Return a bounded related-word list.
- [x] Cache safely.
- [x] Degrade gracefully if kanji enrichment provider fails.

Acceptance criteria:

- Single-kanji lookup is richer but never makes base lookup fragile.

Verification (2026-08-27):

- [x] Single-code-point kanji detection excludes compounds and kana.
- [x] `kanjiapi.dev` readings, stroke count, JLPT/grade/frequency fields are
      normalized into the shared response; English glosses remain excluded from
      `vietnameseMeanings`.
- [x] Vietnamese meanings from the primary dictionary are merged and related
      words are bounded at ten items.
- [x] Metadata/related-word provider failures are logged with safe operation
      and code fields and leave the base lookup usable.
- [x] Service tests cover detection, enrichment, merge, bounds, and graceful
      failure while retaining the bounded lookup cache.

Commit: `feat(dictionary): add kanji enrichment`

---

## TASK-413 — Add optional Japanese/Vietnamese examples

- [x] Integrate official Tatoeba API v1 or approved equivalent.
- [x] Search examples relevant to the term.
- [x] Prefer Japanese sentences with Vietnamese translations.
- [x] Return at most 3–5 examples.
- [x] Do not block primary lookup if examples are slow/unavailable.
- [x] Add bounded cache.
- [x] Add source attribution.
- [x] Sanitize rendered text.
- [x] Add timeout/fallback tests.

Acceptance criteria:

- Examples improve Lookup but cannot break core lookup.

Verification (2026-08-27):

- [x] `TatoebaProvider` uses official v1 Japanese→Vietnamese translation
      filters and returns at most five normalized pairs.
- [x] Provider text is sanitized and bounded before entering normalized DTOs;
      source URL, contributor, and sentence-level license are preserved.
- [x] Examples use a separate bounded cache with success/no-result TTLs and do
      not block or fail primary lookup when provider access fails.
- [x] Adapter/service tests cover relevant pairs, HTML/script sanitization,
      attribution, cache reuse, and graceful optional-enrichment failure.

Commit: `feat(dictionary): add example sentences`

---

## TASK-414 — Expose project Lookup API

Recommended routes may be adapted to existing conventions:

- `GET /api/v1/lookup`
- `GET /api/v1/lookup/suggest`
- optional dedicated kanji route
- history/favorites routes in later tasks.

- [x] Add authenticated lookup endpoint.
- [x] Validate query/direction/limit.
- [x] Add suggestions endpoint.
- [x] Add provider-cost-aware rate limiting.
- [x] Use project error envelope.
- [x] Hide provider internals.
- [x] Update OpenAPI.
- [x] Add integration tests.

Acceptance criteria:

- Web/Android need only Japanese Study Hub API.

Verification (2026-08-27):

- [x] `DictionaryController` exposes authenticated `/lookup` and `/lookup/suggest`
      routes; no provider URL or payload is present in the client contract.
- [x] DTO validation bounds q/direction/limit/examples before the service and
      global validation remains whitelist + forbid-non-whitelisted.
- [x] Lookup and suggestions use separate provider-cost-aware throttles
      (30/minute and 60/minute) on top of authenticated access.
- [x] Domain/provider failures map to safe project error envelopes with stable
      codes; provider names, URLs, raw messages, and payloads are hidden.
- [x] Controller/error-mapper tests and the API module compilation cover route
      wiring; protected endpoint integration coverage is added without using
      live provider calls.

Commit: `feat(api): expose dictionary lookup`

---

# Phase 3C — Lookup history and favorites

## TASK-420 — Add bounded lookup history

- [x] Persist history server-side so Web/Android share it.
- [x] Store only compact metadata: query, direction, selected primary label if useful, timestamp.
- [x] Do not store full provider responses.
- [x] Limit to 100 recent items per logical user.
- [x] Automatically prune older entries.
- [x] Deduplicate repeated adjacent/same-query entries where sensible.
- [x] Add history list API.
- [x] Add clear-history API.
- [x] Add migration if needed.
- [x] Add retention tests.

Acceptance criteria:

- History is cross-device and predictably bounded.

Verification (2026-08-27):

- [x] `DictionaryHistoryService` normalizes Unicode queries, upserts on the
      `(user_key, query, direction)` key, prunes rows after the 100th item, and
      returns compact bounded DTOs.
- [x] Authenticated `GET /lookup/history` and `DELETE /lookup/history` are
      wired in the Dictionary module; successful lookup writes history without
      making a history failure fail the lookup response.
- [x] Migration harness passed both fresh and V1-to-Phase 3 upgrades with 9
      migrations and the `dictionary_lookup_history` table present.
- [x] Focused history/controller tests and the full API suite passed (147
      tests passed, 2 integration tests skipped because no integration flag was
      requested); API build, typecheck, and lint passed.

Commit: `feat(dictionary): add bounded lookup history`

---

## TASK-421 — Add dictionary favorites

- [x] Add compact favorite model.
- [x] Store term, reading, Vietnamese meaning summary, direction/source metadata needed to reopen lookup.
- [x] Do not persist full provider payload.
- [x] Add favorite/unfavorite endpoints.
- [x] Add list endpoint.
- [x] Prevent obvious duplicates.
- [x] Paginate/bound the list.
- [x] Add migration and tests.

Acceptance criteria:

- User can save useful terms without immediately creating a Flashcard.

Verification (2026-08-27):

- [x] `DictionaryFavorite` stores only bounded flattened fields and uses the
      unique `(user_key, term, direction, reading)` key for idempotent saves.
- [x] Authenticated POST/GET/DELETE favorites routes are wired with user
      scoping, HTTP(S) source validation, HTML stripping, bounded page size,
      and bounded offset.
- [x] Fresh and V1-to-Phase 3 migration checks passed with
      `dictionary_favorites` present; no raw provider payload column exists.
- [x] Focused favorite/controller tests and the full API suite passed (147
      tests passed, 2 integration tests skipped because no integration flag was
      requested); API build, typecheck, and lint passed.

Commit: `feat(dictionary): add lookup favorites`

---

# Phase 3D — Web Lookup

## TASK-430 — Add Lookup as primary Web navigation

- [x] Add `Tra cứu` / `Lookup` beside Dashboard, Flashcards, Exams, Search.
- [x] Create dedicated Lookup route.
- [x] Keep App Router navigation; no full document reload.
- [x] Add query input.
- [x] Add AUTO/JA→VI/VI→JA direction control.
- [x] Add debounced suggestions.
- [x] Add loading/no-result/provider-error/retry states.
- [x] Add attribution.
- [x] Optimize for repeated keyboard use.
- [x] Verify Japanese/Vietnamese typography.

Acceptance criteria:

- Lookup is a first-class module, not an external redirect.

Verification (2026-08-27):

- [x] `/lookup` is an App Router client route and `Tra cứu` is a protected
      Navbar link using the existing `PrefetchLink`; no external dictionary
      provider is called by Web.
- [x] The route persists query/direction in the URL, supports AUTO/JA→VI/VI→JA,
      debounces bounded suggestions, supports Enter/Escape, and renders
      loading, no-result, provider-error, retry, and attribution states.
- [x] Web typecheck, lint, API-client/Lookup route tests passed; the shared API
      client builds bounded Lookup, suggestion, history, and favorite requests.

Commit: `feat(web): add lookup module`

---

## TASK-431 — Build Web word/kanji result UI

- [x] Show written form prominently.
- [x] Show reading.
- [x] Show Vietnamese meanings.
- [x] Show part of speech when available.
- [x] Show kanji readings/strokes/JLPT/grade/frequency for single kanji.
- [x] Show bounded related words.
- [x] Show optional examples.
- [x] Show source attribution.
- [x] Add Copy.
- [x] Add Favorite.
- [x] Add “Add to Flashcard”.
- [x] Make responsive.

Acceptance criteria:

- Vocabulary and single-kanji results each have appropriate presentation.

Verification (2026-08-27):

- [x] `LookupResults` renders normalized word, reading, bounded meanings/POS,
      common/frequency hints, single-kanji metadata, related words, optional
      examples, and per-result/source attribution without raw provider markup.
- [x] Copy, idempotent Favorite/unfavorite, and the editable Add-to-Flashcard
      dialog are wired to the existing API client; the dialog requires an
      existing target set and never silently creates one.
- [x] Web typecheck, lint (no warnings), full Web test suite (34 tests), and
      production `next build` passed; `/lookup` is included in the optimized
      route output.

Commit: `feat(web): build lookup results`

---

## TASK-432 — Add Web history/favorites

- [x] Show recent history.
- [x] Limit initial visible entries.
- [x] Add clear-history confirmation.
- [x] Show favorites.
- [x] Clicking history/favorite reruns/reopens Lookup.
- [x] Handle stale/obsolete results gracefully.
- [x] Avoid loading large history payloads on every page.

Acceptance criteria:

- History/favorites are useful without becoming a second dictionary database.

Verification (2026-08-27):

- [x] `LookupSavedItems` loads only the Lookup route's bounded history/favorite
      pages, renders at most 8 initial entries per panel, and never mirrors
      provider responses in browser state.
- [x] History clear requires confirmation; history/favorite selection updates
      the App Router URL and reruns the authenticated lookup; favorite removal
      and lookup saves update the bounded React Query page optimistically.
- [x] Stale/obsolete entries remain safe text projections and provider/query
      failures are shown without breaking the current route.
- [x] Web typecheck, lint, and full 34-test suite passed.

Commit: `feat(web): add lookup history and favorites`

---

## TASK-433 — Add Quick Lookup shortcut

- [x] Add lightweight `Ctrl+K` or `/` shortcut when not conflicting with inputs.
- [x] Open/focus a compact lookup action or navigate to Lookup.
- [x] Preserve current page as return target.
- [x] Support Escape/cancel.
- [x] Keep accessible.
- [x] Do not build a heavy generic command palette.

Acceptance criteria:

- Quick Lookup is available without competing with ordinary text input.

Verification (2026-08-27):

- [x] The authenticated layout mounts a small accessible Quick Lookup dialog;
      Ctrl/Cmd+K and `/` ignore editable targets, Escape and backdrop cancel,
      and `/lookup` receives a direct focus event.
- [x] Navigation carries a bounded same-origin `returnTo` path, and Lookup
      preserves it through query/suggestion navigation without storing payloads.
- [x] Web typecheck, lint, and full Web tests passed, including shortcut helper
      coverage; production route build passed in TASK-431.

Commit: `feat(web): add quick lookup shortcut`

---

# Phase 3E — Lookup → Flashcard

## TASK-440 — Add “Add to Flashcard” from Lookup

- [x] Let user select target Flashcard Set.
- [x] Prefill sensible content.
- [x] Default Front: Japanese written form + reading.
- [x] Default Back: Vietnamese meaning + optional short example.
- [x] For VI→JA lookup, keep Japanese as the learnable side by default.
- [x] Allow editing before save.
- [x] Do not silently create a new set.
- [x] Reuse existing Flashcard create API.
- [x] Preserve Markdown safety.
- [x] Invalidate/update Phase 2 caches correctly.
- [x] Add tests.

Acceptance criteria:

- Useful dictionary result can become a Flashcard without manual copy/paste.

Verification (2026-08-27):

- [x] Lookup opens an accessible dialog that loads at most 100 existing sets,
      requires an explicit target, and offers editable Front/Back fields.
- [x] The default projection keeps Japanese written form/reading on Front and
      Vietnamese meaning plus one optional example on Back for either lookup
      direction; React textareas render as text, not HTML.
- [x] Save reuses `POST /flashcard-sets/:setId/cards`, invalidates the affected
      Phase 2 flashcard/dashboard/search/tag queries, and never creates a set.
- [x] Draft/API client tests passed as part of the 36-test Web suite; Web
      typecheck, lint, and production build passed.

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

- [x] Use URL state + bounded in-memory/session metadata where appropriate.
- [x] Do not persist huge API payloads.
- [x] Keep authoritative content on server/Phase 2 query cache.
- [x] Define expiry/cleanup.
- [x] Define browser refresh and Back/Forward behavior.

Acceptance criteria:

- Continuity behavior is explicit before UI implementation.

Verification (2026-08-27):

- [x] `apps/web/src/lib/continuity.ts` stores only bounded IDs/metadata in
      session storage, caps the card order at 500 IDs/32 KiB, expires entries
      after 30 minutes, and rejects malformed or unsafe return paths.
- [x] Web tests cover normal/shuffled Front/Back state, expiry, no payload
      persistence, and changed/deleted-card fallback. Web typecheck, lint, and
      full test suite passed.
- [x] Architecture and testing documentation define refresh, Back/Forward,
      missing-resource fallback, and the submitted-review server boundary.

Commit: `docs(ux): define lookup continuity state`

---

## TASK-451 — Preserve Flashcard study state around Lookup on Web

- [x] Allow Lookup while studying Flashcards.
- [x] Preserve current card.
- [x] Preserve Front/Back side.
- [x] Preserve shuffle order/session.
- [x] Preserve progress.
- [x] Preserve safe `returnTo`.
- [x] Return to exact prior study position.
- [x] Avoid unnecessary refetch on warm return.
- [x] Recover safely if underlying set/card changed/deleted.
- [x] Clear invalid/expired continuity state.

Mandatory tests:

- [x] Normal order.
- [x] Shuffle order.
- [x] Front/Back.
- [x] Changed/deleted card fallback.

Acceptance criteria:

- `Flashcard → Lookup → Back` restores the exact study state.

Verification (2026-08-27):

- [x] Study mode persists the current card ID/index, ordered IDs, side,
      shuffle/completion state, progress, and a bounded return path; the set
      query remains warm for 45 seconds/5 minutes and authoritative card text
      is re-read from the API/query cache.
- [x] The continuity suite passed 3 tests, and the complete Web suite passed
      21 files/44 tests with typecheck and lint green.

Commit: `feat(web): preserve flashcard lookup continuity`

---

## TASK-452 — Block Lookup during active Exam attempts

Owner rule:

> Lookup is only allowed from Exam after the exam is finished and the user is reviewing submitted answers/mistakes.

- [x] Detect `IN_PROGRESS` attempt state.
- [x] Hide/disable Lookup navigation while taking an exam.
- [x] Disable Quick Lookup during active attempt.
- [x] Show a clear message for blocked in-app actions.
- [x] Preserve server-backed attempt restore after accidental refresh/navigation.
- [x] Do not attempt impossible browser-wide blocking of other tabs/sites.
- [x] Do not change server-authoritative timer.
- [x] Do not expose answers.
- [x] Add regression tests.

Acceptance criteria:

- Normal in-app navigation cannot open Lookup from an unfinished exam.

Verification (2026-08-27):

- [x] Navbar, Quick Lookup, and the Lookup route all honor the bounded
      per-tab active/pending attempt marker; blocked actions show an explicit
      message. Pending markers expire after two minutes and finalization clears
      the marker.
- [x] Live-attempt query policy remains zero-stale/zero-gc, server expiry still
      drives the countdown, and live payload validation still rejects answer-key
      metadata. Web tests passed 21 files/44 tests plus typecheck/lint.
- [x] The implementation documents that other browser tabs/sites are outside
      this in-app navigation boundary.

Commit: `feat(exams): restrict lookup during active attempts`

---

## TASK-453 — Preserve submitted Exam review state around Lookup on Web

- [x] Enable Lookup only after submission/finalization.
- [x] Allow from full result review, wrong-answer review, and unanswered review.
- [x] Preserve attempt ID.
- [x] Preserve current review question.
- [x] Preserve review filter.
- [x] Preserve scroll/list position where practical.
- [x] Return to exact prior review context.
- [x] Use graded server data only.
- [x] Handle missing/deleted attempt gracefully.

Acceptance criteria:

- `Submitted review → Lookup → Back` restores the same reviewed question/filter.

Verification (2026-08-27):

- [x] Added authenticated `GET /attempts/{attemptId}/result`, which rejects
      non-submitted attempts and reloads immutable graded data for the review
      route. Missing/deleted attempts render a safe unavailable state.
- [x] Review workspace persists only attempt/exam/version, question ID, filter,
      bounded scroll position, and safe return path. It exposes Lookup from the
      full result, wrong-answer, and unanswered filters.
- [x] API tests passed 30 files/149 tests (2 documented integration skips),
      Web tests passed 21 files/44 tests, and both typechecks/lint passed.

Commit: `feat(web): preserve exam review lookup continuity`

---

# Phase 3G — Android Lookup and continuity

## TASK-460 — Add Lookup to Android

- [x] Add Lookup to Compose navigation.
- [x] Add query input.
- [x] Support AUTO/JA→VI/VI→JA.
- [x] Add debounced suggestions.
- [x] Render vocabulary result.
- [x] Render kanji detail.
- [x] Render examples.
- [x] Add loading/no-result/error/retry.
- [x] Show attribution.
- [x] Call only project backend APIs.

Acceptance criteria:

- Android has the same core Lookup capability as Web.

Commit: `feat(android): add lookup module`

Verification (2026-08-27): Android Compose navigation, backend-only dictionary
repository calls, bounded suggestion debounce, normalized result rendering and
attribution are implemented. `:app:compileDebugKotlin`, `:app:testDebugUnitTest`,
`:app:lintDebug`, `:app:assembleDebug`, `:app:assembleProduction`, and
`:app:verifyApiBaseUrls` passed with the local Android SDK.

---

## TASK-461 — Add Android history/favorites/Add-to-Flashcard

- [x] Show bounded shared lookup history.
- [x] Add clear-history.
- [x] Add dictionary favorites.
- [x] Add Add-to-Flashcard.
- [x] Reuse server persistence.
- [x] Integrate with existing Android cache only where safe.
- [x] Do not mirror the entire external dictionary into Room.

Commit: `feat(android): complete lookup productivity features`

Verification (2026-08-27): History/favorites and flashcard creation use the
shared API contracts; UI limits displayed data and no dictionary payload is
written to Room. The Android compile/unit/lint/debug-production build gates
listed under TASK-460 passed.

---

## TASK-462 — Preserve Android Flashcard continuity around Lookup

- [x] Preserve current card.
- [x] Preserve Front/Back.
- [x] Preserve shuffle order.
- [x] Preserve progress.
- [x] Navigate to Lookup and return.
- [x] Survive normal configuration changes.
- [x] Keep saved state compact.
- [x] Recover safely after underlying data changes.

Acceptance criteria:

- Android `Flashcard → Lookup → Back` restores exact study state.

Commit: `feat(android): preserve flashcard lookup continuity`

Verification (2026-08-27): `SavedStateHandle` stores only bounded card IDs,
index, side and shuffle metadata. Exact-permutation restore and changed/deleted
card fallback are covered by `StudySessionLogicTest`; Android compile/unit/lint
gates passed.

---

## TASK-463 — Restrict active Exam Lookup and preserve submitted review on Android

- [x] Hide/disable Lookup while exam is in progress.
- [x] Preserve normal server-backed attempt restoration.
- [x] Enable Lookup after submission.
- [x] Preserve current submitted review question/filter.
- [x] Restore exact review state after Lookup.
- [x] Preserve timer and no-answer-leakage invariants.

Acceptance criteria:

- Android behavior matches Web.

Commit: `feat(android): preserve exam lookup continuity`

Verification (2026-08-27): A bounded `AttemptStore.activeAttempts` flow disables
the Lookup destination and direct screen while an official attempt is active;
the existing persisted attempt/timer path remains unchanged. Submitted review
state is saved in `SavedStateHandle` and filters use graded result data only.
`:app:compileDebugKotlin`, `:app:testDebugUnitTest`, `:app:lintDebug`,
`:app:assembleDebug`, `:app:assembleProduction`, and `:app:verifyApiBaseUrls`
passed.

---

# Phase 3H — Last 3 wrong official attempts

## TASK-470 — Define exact retention semantics

Owner requirement:

> Save wrong-answer data from exam attempts and retain only the 3 most recent official attempts.

Rules to encode:

- [x] Scope retention by logical user + exam + exam content version.
- [x] Count only official submitted exam attempts.
- [x] Do not count Phase 2 practice/incorrect-only sessions.
- [x] Retain detailed wrong/unanswered review data for the newest 3 official attempts.
- [x] On the 4th official attempt, prune detailed review data for the oldest retained attempt in the same scope.
- [x] Keep best-score summary independent from this retention window.
- [x] Keep overall attempt count/summary metadata if already part of product behavior.
- [x] Do not mix old and current exam content versions.
- [x] Treat unanswered questions as reviewable mistakes.
- [x] Define ordering by server `submitted_at`.
- [x] Define exact snapshot fields needed for historically correct review.
- [x] Decide/document whether old-version last-3 data stays accessible historically or only current version is surfaced.

Acceptance criteria:

- “Last 3” has one deterministic server-side meaning.
- Best-result semantics remain unchanged.

Commit: `docs(exams): define last three mistake retention`

Verification (2026-08-27): ADR-035 and the database documentation define one
deterministic policy: server `submitted_at` desc/id desc, official submitted
attempts only, scoped by logical user/exam/content version, with wrong and
unanswered snapshots for exactly the newest three. Best results and attempt
counts remain independent; older versions are isolated and not surfaced by the
current-version review UI.

---

## TASK-471 — Add stable wrong-answer review snapshot storage

- [x] Inspect Phase 2 mistake-review implementation first.
- [x] Reuse/extend existing schema instead of creating duplicate parallel models.
- [x] Add a new Prisma migration only if needed.
- [x] Never edit applied migrations.
- [x] Store enough graded data to remain accurate after future content changes.
- [x] For each wrong/unanswered retained item, preserve as needed:
  - question ID;
  - question content snapshot or version-safe reference;
  - ordered option snapshot if required;
  - selected option;
  - correct option;
  - correctness/unanswered state;
  - question position.
- [x] Avoid retaining unnecessary correct-question detail.
- [x] Add indexes for recent-attempt review/pruning.
- [x] Verify storage stays bounded by the last-3 policy.
- [x] Test Phase 2 → Phase 3 migration.
- [x] Test fresh DB migration.

Acceptance criteria:

- Retained wrong-answer review remains historically correct and bounded.

Verification (2026-08-27): Extended the existing `exam_mistakes` model with
immutable question/option/submission snapshots and scoped indexes; legacy
orphan rows are safely excluded before strict snapshot/FK constraints. Fresh
and V1-to-Phase 3 migration harnesses both passed with 10 migrations.

Commit: `feat(db): add bounded exam mistake retention`

---

## TASK-472 — Implement transactional last-3 pruning

- [x] Integrate pruning into official attempt finalization or equivalent safe transaction.
- [x] Identify newest 3 official submitted attempts in scope.
- [x] Preserve detailed wrong/unanswered review data for those 3.
- [x] Prune detailed review data older than 3.
- [x] Never delete best-result summary.
- [x] Never prune in-progress attempt.
- [x] Never count practice attempt.
- [x] Keep duplicate/idempotent submit safe.
- [x] Handle retry/concurrency safely.

Mandatory tests:

- [x] Attempt 1 retained.
- [x] Attempt 2 retained.
- [x] Attempt 3 retained.
- [x] Attempt 4 prunes attempt 1 detailed review.
- [x] Attempt 5 prunes attempt 2 detailed review.
- [x] Practice attempt does not shift window.
- [x] Another exam is unaffected.
- [x] Another exam version is not mixed.
- [x] Duplicate submit does not corrupt/prune twice.
- [x] Best score remains correct.

Acceptance criteria:

- Exactly the intended 3 recent official mistake histories remain.

Verification (2026-08-27): Official finalization now claims the attempt row
inside the transaction, snapshots only wrong/unanswered questions, prunes by
user/exam/version after each official submit, and leaves practice/best-result
paths isolated. Unit tests cover five submissions, practice, scope isolation,
and a losing concurrent submit; the PostgreSQL integration test passed the
five-attempt window and best-result count assertions.

Commit: `feat(exams): retain last three mistake attempts`

---

## TASK-473 — Add Last-3 Mistake Review API

Recommended routes may be adapted to existing Phase 2 API:

- `GET /api/v1/exams/{examId}/mistake-attempts`
- `GET /api/v1/exam-attempts/{attemptId}/mistakes`
- optional aggregate endpoint for frequent mistakes.

- [x] Return at most 3 retained attempt summaries, newest first.
- [x] Include submitted time, score, correct/total, and version.
- [x] Return only wrong/unanswered review items for selected retained attempt.
- [x] Include correct answer data only because the attempt is already submitted.
- [x] Enforce auth.
- [x] Enforce version/history policy.
- [x] Bound result size.
- [x] Add frequent-mistake aggregate across retained attempts.
- [x] Keep best-result API unchanged.
- [x] Update OpenAPI.
- [x] Add integration tests.

Acceptance criteria:

- Web/Android can render the required history using stable server data.

Verification (2026-08-27): Added authenticated bounded attempt-list, retained
detail, and frequent-mistake routes with current-version/official-user
filters, snapshot-only answer data, 3-attempt/100-item caps, controller and
service tests, and a passing PostgreSQL integration flow.

Commit: `feat(api): expose recent mistake attempts`

---

# Phase 3I — Wrong-answer review UX

## TASK-480 — Add Web “3 lần gần nhất” review

- [x] Add Mistakes/Review area for an exam.
- [x] Show newest, second newest, third newest retained attempt.
- [x] Hide nonexistent attempt tabs.
- [x] Show attempt date/time and score.
- [x] Show wrong questions.
- [x] Show unanswered questions.
- [x] Show selected wrong option.
- [x] Show correct option.
- [x] Use labels/icons as well as color.
- [x] Add Lookup action per review item.
- [x] Preserve continuity around Lookup.
- [x] Add “Add to Flashcard”.
- [x] Add loading/empty/error states.

Acceptance criteria:

- User can inspect exactly the retained 3 official mistake histories.

Verification (2026-08-27): Added the protected per-exam Web review route with
bounded three-tab history, official snapshot filters, explicit selected/correct
labels and icons, loading/empty/error states, question-position continuity,
bounded Lookup return paths, and editable Flashcard action. Web typecheck and
route/continuity tests passed.

Commit: `feat(web): add last three mistake review`

---

## TASK-481 — Add frequent-mistake summary

- [x] Aggregate mistakes across the retained applicable attempts.
- [x] Rank by frequency.
- [x] Display `1/3`, `2/3`, `3/3` or correct denominator when fewer attempts exist.
- [x] Never aggregate across exam content versions.
- [x] Allow opening the question.
- [x] Allow Lookup.
- [x] Allow Add to Flashcard.
- [x] Keep UI lightweight; no heavy analytics/charts.

Acceptance criteria:

- Repeated weak questions are easy to identify.

Verification (2026-08-27): The Web summary consumes the server aggregate,
displays occurrence/retained denominators, opens the source question, and
provides direct bounded Lookup and concise Flashcard actions. API service,
integration, and Web draft tests passed.

Commit: `feat(exams): summarize frequent mistakes`

---

## TASK-482 — Add Android last-3 mistake review

- [x] Show retained attempt selector/list.
- [x] Show wrong/unanswered review items.
- [x] Show selected/correct answer state.
- [x] Add Lookup.
- [x] Preserve review state around Lookup.
- [x] Add Add-to-Flashcard.
- [x] Show frequent-mistake summary if shared API supports it.
- [x] Add loading/empty/error states.

Acceptance criteria:

- Android and Web share the same retention semantics.

Verification (2026-08-27): Android now maps the shared bounded history/detail/
frequent APIs defensively (3 attempts, 100 items), preserves selected exam,
attempt, filter, and question in SavedStateHandle, launches prefilled Lookup
with a pop-back route, and offers editable Flashcard creation. Compose unit
logic plus `:app:compileDebugKotlin`, `:app:testDebugUnitTest`, and
`:app:lintDebug` passed.

Commit: `feat(android): add last three mistake review`

---

# Phase 3J — Mistake → Flashcard

## TASK-490 — Add “Create Flashcard from Mistake”

- [x] Add action from wrong/unanswered review item.
- [x] Let user select target Flashcard Set.
- [x] Prefill editable content.
- [x] Recommended Front: question/prompt context.
- [x] Recommended Back: correct answer + concise context.
- [x] Optionally include selected wrong answer.
- [x] Avoid noisy auto-generated cards containing unnecessary option lists.
- [x] Preserve Markdown safety.
- [x] Reuse existing Flashcard API.
- [x] Invalidate/update relevant Web/Android caches.
- [x] Add tests.
- [x] Do not add fuzzy duplicate infrastructure unless a simple reliable check already exists.

Acceptance criteria:

- Mistakes can become study material with minimal manual work.

Verification (2026-08-27): Web and Android review cards use concise
question/answer drafts, optionally include the selected wrong answer, keep the
draft editable, require an existing target set, and reuse the existing card
creation endpoint. Web query/draft tests and Android cache/logic tests cover
the path; Web invalidates set/dashboard/search/tag queries and Android updates
only its bounded set-count metadata cache.

Commit: `feat(flashcards): create cards from exam mistakes`

---

# Phase 3K — Provider resilience and bounded storage

## TASK-500 — Harden provider boundaries

- [x] Add strict timeouts.
- [x] Add only lightweight failure suppression/circuit behavior if repeated failures justify it.
- [x] Allow kanji/examples enrichment to fail independently from core lookup.
- [x] Rate-limit project Lookup endpoints.
- [x] Validate external response shape/size.
- [x] Treat malformed provider data as untrusted.
- [x] Sanitize displayed definitions/examples.
- [x] Never expose provider/server internals.
- [x] Honor Retry-After/rate-limit metadata where available.
- [x] Add regression tests for provider timeout and malformed data.

Acceptance criteria:

- External dictionary downtime cannot destabilize the learning app.

Verification (2026-08-27): ProviderHttpClient enforces the 2.5-second timeout,
256 KiB body cap, one transient retry, bounded per-provider failure suppression,
strict JSON/adaptor validation, and safe logs. Retry-After/X-RateLimit-Reset
metadata is preserved as a bounded HTTP hint; 429 is never retried. Core lookup
and optional kanji/examples enrichment remain independently degradable.
Provider, controller, and global-filter regression tests passed.

Commit: `security(dictionary): harden provider boundaries`

---

## TASK-501 — Verify all Phase 3 storage is bounded

- [x] Exercise many unique lookups.
- [x] Verify lookup cache max entry count.
- [x] Verify expired cache entries are collectible.
- [x] Verify history stops at configured cap.
- [x] Verify cookies contain no dictionary/learning payload.
- [x] Verify browser local/session storage stays small.
- [x] Verify Android cache does not become a full dictionary mirror.
- [x] Verify last-3 mistake storage stays bounded after many attempts.
- [x] Document measured storage behavior.

Verification (2026-08-27): API cache/history, Web continuity/active-marker/
QueryClient, Android Room, and five-attempt integration tests passed. The
measured bounds and the no-cookie source audit are recorded in
`docs/performance/cache-storage-policy.md`.

Acceptance criteria:

- Phase 3 satisfies the owner requirement of useful but moderate caching/storage.

Commit: `test(storage): verify phase 3 cache bounds`

---

# Phase 3L — Automated tests

## TASK-510 — Dictionary unit test completion

- [x] Direction auto-detection.
- [x] Japanese Unicode normalization.
- [x] Vietnamese diacritic preservation.
- [x] Empty/invalid query.
- [x] Provider normalization.
- [x] Provider timeout mapping.
- [x] Rate-limit mapping.
- [x] No-result behavior.
- [x] Single-kanji detection.
- [x] Kanji normalization.
- [x] Cache key normalization.
- [x] Cache TTL/max-size behavior.

Verification (2026-08-27): dictionary lookup/cache, provider adapter, provider
HTTP boundary, and controller specs passed, including the Phase 3 bounded
lookup stress and safe Retry-After/circuit assertions.

Commit: `test(dictionary): add unit coverage`

---

## TASK-511 — Dictionary integration test completion

- [x] Lookup endpoint success.
- [x] Japanese → Vietnamese.
- [x] Vietnamese → Japanese.
- [x] Suggestions.
- [x] Kanji enrichment.
- [x] Examples graceful failure.
- [x] Auth protection.
- [x] Rate limit.
- [x] History cap and clear.
- [x] Favorite/unfavorite.
- [x] Provider unavailable safe response.
- [x] Attribution/source metadata.

Verification (2026-08-27): the opt-in `phase3.dictionary.integration.spec.ts`
starts the real Nest HTTP application against PostgreSQL, authenticates with an
ephemeral test hash, replaces only external providers with deterministic test
doubles, and passed both integration cases. The API integration script now
executes every file under `apps/api/test`.

Commit: `test(dictionary): add integration coverage`

---

## TASK-512 — Navigation continuity regression tests

Web:

- [x] Flashcard normal session → Lookup → exact return.
- [x] Flashcard shuffle session → Lookup → exact return.
- [x] Front/Back state preserved.
- [x] Active Exam blocks in-app Lookup.
- [x] Submitted Exam review → Lookup → exact return question/filter.
- [x] Browser Back behavior.
- [x] Changed/deleted resource fallback.

Android:

- [x] Same Flashcard continuity.
- [x] Active Exam Lookup restriction.
- [x] Submitted review continuity.

Verification (2026-08-27): Web continuity specs cover normal and shuffled card
order, front/back state, TTL/changed-resource fallback, bounded return paths,
active-attempt gating, and submitted-review question/filter restoration. The
Web review component routes Lookup with an exact same-origin return path and
uses router back for browser history. Android unit tests cover SavedStateHandle
card order/index/front-back restoration, active-exam lookup suppression, and
bounded submitted-question lookup navigation; Android compile, unit tests, and
lint passed.

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
