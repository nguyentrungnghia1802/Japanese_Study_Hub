# 08 — Testing Specification

## 1. Testing goals

Tests shall protect the highest-risk behaviors:

- Import parsing
- Exam integrity
- Scoring
- Timer
- Best-score updates
- Folder hierarchy
- Data transactions
- Authentication

---

## 2. Test layers

### Unit tests

For pure/domain logic:

- Markdown parsers
- Scoring
- Exam version change classification
- Folder depth calculation
- Sorting utilities
- Validation functions

### Integration tests

For:

- NestJS services/controllers
- Prisma/database behavior
- Transactions
- Authentication
- Import confirm
- Best-score upsert

### E2E tests

For critical user journeys:

- Login
- Create/edit/study flashcards
- Flashcard Markdown import
- Create/import exam
- Start/submit timed exam
- Best-score behavior

---

## 3. Mandatory flashcard tests

- Create set
- Edit set
- Soft delete set
- Duplicate set
- Create card
- Edit card
- Delete card
- Reorder cards
- Front/back required
- Japanese Unicode preserved
- Markdown sanitization
- Search finds Japanese text

---

## 4. Mandatory flashcard import tests

- Valid 1-card file
- Valid many-card file
- Missing H1 title
- Missing Front
- Missing Back
- Empty Front
- Empty Back
- Duplicate card numbers
- Reserved heading inside fenced code block
- Malformed UTF-8/binary rejection
- Oversized file rejection
- Preview creates no set
- Confirm creates all records
- DB failure rolls back all records
- Duplicate confirm token does not duplicate import
- Export/import round trip
- Multi-file preview is sequential and bounded
- One file preview/confirm failure leaves other files available
- Multi-file confirm cannot be double-submitted

---

## 5. Mandatory folder tests

- Create root folder
- Create child folder
- Reject third-level folder
- Move root under root to become level 2
- Reject move that makes level 3
- Reject cycles
- Stable ordering
- Non-empty delete policy

---

## 6. Mandatory exam validation tests

- 2 options accepted
- 6 options accepted
- 1 option rejected
- 7 options rejected
- Exactly 1 correct accepted
- 0 correct rejected
- 2 correct rejected
- Unsupported type rejected in V1 create flow
- Japanese content preserved

---

## 7. Mandatory exam Markdown tests

- Valid basic exam
- Untimed exam
- Timed exam
- Invalid time
- Invalid shuffle boolean
- Missing answer key
- Answer key not at end / trailing forbidden structural content handling
- Missing answer for question
- Duplicate answer key entry
- Answer references missing option
- Answer references missing question
- Duplicate option labels
- 2 options accepted
- 6 options accepted
- 7 options rejected
- Round-trip export/import
- Transaction rollback on failure

---

## 8. Mandatory attempt tests

- Start untimed attempt
- Start timed attempt
- Attempt payload contains no correctness data
- Question shuffle stable within attempt
- Option shuffle stable within attempt
- Refresh returns same expiration
- Autosaved answers restore correctly if autosave implemented
- Submit valid answers
- Submit unanswered questions
- Submit after expiry follows timeout policy
- Repeated submit is idempotent
- Cannot edit submitted attempt
- Cannot answer question not belonging to attempt
- Cannot submit option not belonging to question
- Wrong-answer queue contains incorrect and unanswered submitted questions only
- Live mistake queue omits correctness metadata
- Deleted or old-version mistake references are removed
- Practice submission does not write official best-result or mistake history

Phase 3 dictionary retention tests must verify server-owned history,
deduplication by normalized query/direction, pruning at 100 rows, and the
absence of raw provider payloads. Favorite tests must verify compact source
metadata, user scoping, idempotent duplicates, and bounded pagination.

---

## 9. Scoring tests

Examples:

- 0/10 = 0
- 10/10 = 100
- 1/3 = 33.33 according to rounding policy
- 2/3 = 66.67
- Correct selected row output
- Wrong selected row + correct row output
- Unanswered + correct row output

---

## 10. Best-score tests

- First result creates best
- Higher result replaces best
- Lower result does not replace best
- Equal result follows tie policy
- Attempt count increments
- Metadata-only exam edit keeps applicable best
- Content edit increments version
- Old best not shown for new version

---

## 11. Authentication tests

- Correct credentials accepted
- Wrong username rejected
- Wrong password rejected
- Generic failure response
- Protected route without auth rejected
- Logout invalidates/removes client session as designed
- Login rate limiting behavior

---

## 12. Security tests

- Markdown script sanitized
- javascript URL sanitized/rejected
- Oversized uploads rejected
- Binary masquerading as `.md` rejected
- CORS config test in deployment environment where practical
- No `is_correct` field in attempt API snapshot
- Production 500 does not leak stack trace

---

## 13. Migration tests

CI or local release process shall test:

1. Create empty PostgreSQL database.
2. Apply all migrations.
3. Run seed if applicable.
4. Execute integration smoke tests.

For Phase 2, the repeatable local command
powershell -NoProfile -ExecutionPolicy Bypass -File
scripts/verify-phase2-migrations.ps1 also applies only
20260826000000_init to a disposable database, then deploys the remaining
migrations to verify the V1 -> Phase 2 upgrade path. The harness checks the
applied migration count and Phase 2 tables/columns and removes its temporary
databases in finally. API feature integration coverage is opt-in:
RUN_API_INTEGRATION=1 pnpm --filter @japanese-learning/api test:integration.
The dated result is recorded in
docs/testing/phase2-integration-2026-08-27.md.

---

## 14. Web E2E critical path

1. Login
2. Create flashcard set
3. Add two cards
4. Study and flip cards
5. Import flashcard Markdown
6. Create/import exam
7. Start exam
8. Select answers
9. Submit
10. Verify score/highlighting
11. Retake with lower score
12. Verify best unchanged
13. Open Review mistakes and confirm selected/unanswered prompts are sanitized
14. Start Practice, submit, and verify official best remains unchanged

Search-specific checks must also cover Japanese queries, exact-match ranking,
debounce/cancellation, recent-query cache bounds, and safe match highlighting.

The Phase 2 Web journey evidence for login, warm navigation, card editing,
FSRS review, timed exam submission, best-score refresh, mistake practice,
answer-leakage checks, and stale-cache refresh is recorded in
docs/testing/phase2-web-e2e-2026-08-27.md.

The Phase 2 Android emulator journey evidence for session restore, cached
library startup, background refresh, flashcard study/FSRS review, timed exam,
mistake Practice, offline cache retention, and reconnect is recorded in
docs/testing/phase2-android-e2e-2026-08-27.md.

---

## 15. Mobile E2E/smoke path

At minimum verify on target emulator/device:

- Login
- Fetch lists
- Study flashcards
- Review due flashcards, reveal, rate, and retry a failed rating safely
- Start exam
- Timer display
- Select answers
- Submit and review result
- Search with Japanese text, change the query rapidly, and verify the latest
  result wins without a request storm

---

## 16. Phase 2 validation suites

The repeatable Phase 2 suites are:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm perf:bundle
pnpm perf:api-smoke
pnpm perf:api-cache
pnpm audit --prod --audit-level=high
pnpm audit --audit-level=high
RUN_API_INTEGRATION=1 pnpm --filter @japanese-learning/api test:integration
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-phase2-migrations.ps1
```

On PowerShell, set `RUN_API_INTEGRATION` with `$env:RUN_API_INTEGRATION = '1'`
before the integration command. The API smoke command requires the API to be
running and can receive an authenticated token through `API_SMOKE_TOKEN` for
protected endpoints. The Android gate runs from `apps/mobile`:

```text
./gradlew testDebugUnitTest lintDebug assembleDebug assembleProduction verifyApiBaseUrls connectedDebugAndroidTest --no-daemon --console=plain
```

The dated integration, Web E2E, and Android emulator evidence is kept in
`docs/testing/phase2-integration-2026-08-27.md`,
`docs/testing/phase2-web-e2e-2026-08-27.md`, and
`docs/testing/phase2-android-e2e-2026-08-27.md`. These records distinguish local
verification from owner-controlled production gates.

Phase 3 Android continuity unit coverage includes exact flashcard-order
recovery (including changed/deleted-card fallback) and submitted-review filter
semantics. The Android build also compiles the Lookup route, server-backed
history/favorites/actions, active-attempt gate, and submitted-review state.
The device-only portion still requires the Android emulator/device gate in the
command above.

---

## 17. Definition of test completion

A task affecting behavior is not complete until:

- Relevant existing tests pass
- New regression tests are added for new logic/bug fixes
- Typecheck/lint pass
- No skipped critical tests remain without written reason

## Phase 3 continuity checks

The Web suite covers compact Flashcard metadata for normal and shuffled order,
Front/Back state, expiry, and changed/deleted-card fallback. It also covers
active-attempt marker cleanup and the submitted-result route contract. Manual
browser verification must confirm:

1. `Flashcard study → Lookup → Back` restores card ID, side, shuffle order, and
   progress without persisting card text.
2. Lookup navigation and Quick Lookup are disabled while an in-progress exam
   marker exists, while refresh still restores the server-backed attempt.
3. Submitted review can filter wrong/unanswered questions, open Lookup, and
   return to the same filter/question using graded server data.
