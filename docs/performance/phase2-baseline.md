# Phase 2 Web/API Performance Baseline

Recorded: 2026-08-26 (Asia/Bangkok)

## Environment

- Web: Next.js production server, `http://localhost:3000`, local build from the
  V1 baseline.
- API: NestJS production build, `http://localhost:4000`, local PostgreSQL 16 on
  `localhost:5432`.
- Browser: Codex in-app Chromium surface, normal desktop viewport.
- Dataset: clean migrated database with zero flashcard sets, cards, folders, and
  exams. The empty dataset is intentional for a reproducible first baseline; the
  largest payload numbers should be re-measured with representative content
  before large-list optimization.

## Cold route loads

Times are wall-clock milliseconds measured around a browser navigation and a
250 ms settle window. DOM bytes are the visible accessibility snapshot size and
are a rough perceived-content indicator, not a transfer-size measurement.

| Route             | Time (ms) | DOM snapshot bytes |                        API calls by current code |
| ----------------- | --------: | -----------------: | -----------------------------------------------: |
| `/login`          |       406 |                312 |                          0 when no saved session |
| `/` Dashboard     |       320 |              1,657 |             2 (`/auth/me`, `/dashboard/summary`) |
| `/flashcards`     |       313 |                805 |                2 (`/auth/me`, `/flashcard-sets`) |
| `/flashcards/:id` |       419 |                593 |            2 (`/auth/me`, `/flashcard-sets/:id`) |
| `/exams`          |       305 |                925 |        3 (`/auth/me`, `/exam-folders`, `/exams`) |
| `/exams/:id`      |       400 |                631 |                     2 (`/auth/me`, `/exams/:id`) |
| `/search`         |       327 |                720 | 1 (`/auth/me`; search waits for non-empty input) |

The route-level source audit found no duplicate same-key calls within a single
page load, but each full document load repeats `/auth/me`, and Dashboard reloads
its summary after each import success. Search/list inputs each own a 300 ms timer
and issue independent requests, so obsolete requests are not cancelled.

## Warm client navigation

Using the visible navbar links in the same authenticated tab:

| Transition                      | Time (ms) |
| ------------------------------- | --------: |
| Dashboard → Flashcards          |     3,315 |
| Flashcards → Dashboard          |     3,304 |
| Dashboard → Flashcards (repeat) |     3,293 |
| Flashcards → Dashboard (repeat) |     3,308 |

The baseline application preserves the root layout through Next navigation, but
page components fetch from scratch on mount. The warm transitions still wait for
the route's independent network fetch and render loading states; the page does
not reuse prior data.

## API response baseline

Five representative authenticated GET requests and `/health` were measured with
PowerShell `Invoke-WebRequest` after the API was warm. Payload bytes are UTF-8
response body bytes.

| Endpoint                          | Status | Time (ms) | Payload bytes | Cache-Control |
| --------------------------------- | -----: | --------: | ------------: | ------------- |
| `/dashboard/summary`              |    200 |        13 |           118 | absent        |
| `/flashcard-sets?page=1&limit=20` |    200 |         5 |            57 | absent        |
| `/exam-folders`                   |    200 |         8 |             2 | absent        |
| `/exams?page=1&limit=20`          |    200 |         8 |            22 | absent        |
| `/search?q=日本語&limit=20`       |    200 |         8 |            70 | absent        |
| `/health`                         |    200 |         3 |            89 | absent        |

Express already emits weak `ETag` headers, but no explicit private cache policy
or conditional-cache tests existed. With an empty database, the largest observed
API body was 118 bytes; representative populated-set/detail measurements remain
an explicit follow-up for the response-size guardrail.

## Loading and Web Vitals observations

- Dashboard displays zero/empty content while its first request is pending rather
  than a stable content skeleton.
- Flashcard and exam library pages clear their lists and show a blocking loader on
  every fetch, including search/folder changes.
- Search uses a visible loading panel, but it does not preserve prior results while
  a new query is pending.
- The browser automation surface did not expose `PerformanceObserver` or the
  Navigation/Resource Timing API to its read-only page evaluator. LCP, INP, and CLS
  are therefore recorded as **not available in this baseline run**, not inferred.
  They must be captured with a real Chromium performance trace before release if
  the deployment provides that tooling.

## Optimization targets

1. Centralize in-memory query reads and invalidate by domain key.
2. Keep prior list/detail data visible during background revalidation.
3. Cancel obsolete search/autosave requests and deduplicate concurrent GETs.
4. Preserve strict freshness for live attempts and do not persist answer-sensitive
   responses.
5. Add private conditional HTTP caching and response-size/query-count checks after
   the cache layer is in place.
