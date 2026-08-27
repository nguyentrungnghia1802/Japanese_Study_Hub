# 04 — API Specification

## 1. API style

- REST
- JSON
- Current owner deployment is IP-only HTTP; HTTPS is the required upgrade target
  and must not be claimed until the documented transport gate passes.
- OpenAPI-generated documentation
- Version prefix: `/api/v1`

The global `/api/v1` prefix applies to application routes. Public health routes
are intentionally excluded from that prefix: `/health` and `/health/ready`.

---

## 2. Common response rules

The current implementation returns direct resource DTOs on success and the
following envelope for errors:

Error envelope:

```json
{
  "error": {
    "code": "EXAM_INVALID_OPTION_COUNT",
    "message": "Question 7 must contain between 2 and 6 options.",
    "details": {
      "question": 7
    },
    "requestId": "..."
  }
}
```

Do not expose stack traces in production responses.

### 2.1 Phase 3 dictionary routes

`GET /api/v1/lookup?q=<term>&direction=AUTO|JA_TO_VI|VI_TO_JA&limit=20&includeExamples=false`
and `GET /api/v1/lookup/suggest?q=<prefix>&direction=...&limit=10` are
authenticated project routes. They call the API-owned provider adapters only;
Web and Android never call dictionary providers directly. Lookup is limited to
30 requests/minute per throttling key and suggestions to 60 requests/minute.
The response shape, bounds, attribution, and stable dictionary error codes are
documented in [`docs/dictionary/contracts.md`](dictionary/contracts.md).

`GET /api/v1/lookup/history?limit=10` returns the latest bounded compact
lookup entries shared by Web and Android. `DELETE /api/v1/lookup/history`
clears the authenticated logical user's history. A successful lookup records
only its normalized query, resolved direction, optional primary label, and
timestamp; it never writes the provider response.

`POST /api/v1/lookup/favorites` saves or updates a compact favorite projection
(`term`, `reading`, `meaningSummary`, resolved `direction`, and flattened
source attribution). `GET /api/v1/lookup/favorites?limit=20&offset=0` returns a
bounded page, and `DELETE /api/v1/lookup/favorites/:id` removes only the
authenticated user's favorite. Favorites are idempotent on
`term + direction + reading` and contain no raw provider payload.

### 2.1 Current request headers and transport cache policy

Protected application requests send `Authorization: Bearer <accessToken>`.
The API emits `Vary: Authorization` on responses. Authenticated normal `GET` and
`HEAD` reads use `Cache-Control: private, no-cache` and Express ETag
revalidation. Authentication, health, export, attempt/live responses, and all
non-`GET`/`HEAD` methods use `Cache-Control: no-store`. There is no shared/public
learning-data cache. CORS uses the explicitly configured origins with
credentials enabled, but the current Web client does not use cookies.

---

## 3. Authentication endpoints

### `POST /api/v1/auth/login`

Request:

```json
{
  "username": "...",
  "password": "..."
}
```

Response:

- `accessToken` (JWT), `expiresIn` (604800 seconds), and `user.username`
- Never return password/hash/secrets

The current Web and Android clients store/use the bearer token according to
`docs/security/web-auth-session-audit.md`; authentication is not cookie-based.

Errors:

- 400 invalid payload
- 401 invalid credentials
- 429 rate limited

### `POST /api/v1/auth/logout`

Returns `{ "success": true }`. The client removes its token and username; the
stateless JWT is not revoked server-side.

### `GET /api/v1/auth/me`

Returns `{ "username": "...", "authenticated": true }`.

---

## 4. Flashcard set endpoints

### `GET /api/v1/flashcard-sets`

Query:

- `search`
- `sort`
- `page`
- `limit` (maximum 100)
- `favorite`
- `tag` (normalized slug)

### `POST /api/v1/flashcard-sets`

Creates a set.

### `GET /api/v1/flashcard-sets/{setId}`

Returns set detail with its active cards.

### `PATCH /api/v1/flashcard-sets/{setId}`

Metadata update.

### `DELETE /api/v1/flashcard-sets/{setId}`

Soft delete.

### `POST /api/v1/flashcard-sets/{setId}/duplicate`

Creates a copy with duplicated cards.

### `PUT /api/v1/flashcard-sets/{setId}/favorite`

Sets the favorite state with `{ "favorite": true|false }`. The operation is
idempotent and rejects soft-deleted sets.

`GET /api/v1/flashcard-sets` accepts optional `favorite=true|false` filtering.

`GET /api/v1/flashcard-sets` also accepts `tag=<normalized-slug>`. The response
contains a bounded `tags` summary and `PUT /api/v1/flashcard-sets/{setId}/tags`
replaces all assignments atomically with `{ "tags": ["name", "..."] }`.

---

## 5. Flashcard endpoints

### `POST /api/v1/flashcard-sets/{setId}/cards`

### `PATCH /api/v1/flashcard-sets/{setId}/cards/{cardId}`

### `DELETE /api/v1/flashcard-sets/{setId}/cards/{cardId}`

### `POST /api/v1/flashcard-sets/{setId}/cards/{cardId}/duplicate`

### `PUT /api/v1/flashcard-sets/{setId}/cards/reorder`

Request example:

```json
{
  "cardIds": ["id1", "id2", "id3"]
}
```

The API validates that the card IDs belong to the set and that the complete
active-card order is supplied.

---

## 6. Flashcard import/export

### `POST /api/v1/imports/flashcards/preview`

JSON body:

- `{ "content": "...markdown..." }`
- the client accepts `.md`/`.txt` files and sends their text content
- the server validates content and enforces configured request limits

Response:

```json
{
  "importToken": "...",
  "expiresAt": "...",
  "preview": {
    "title": "JLPT N3 Vocabulary",
    "cardCount": 120,
    "warnings": [],
    "errors": []
  }
}
```

### `POST /api/v1/imports/flashcards/confirm`

Request:

```json
{
  "importToken": "...",
  "duplicatePolicy": "RENAME"
}
```

Response: created set.

### `GET /api/v1/flashcard-sets/{setId}/export`

Returns Markdown file response.

---

## 6.1 Flashcard review endpoints

### `GET /api/v1/review/summary`

Returns server-time counts for active cards: `dueCount`, `newCount`, and
`reviewCount`.

### `GET /api/v1/review/queue?limit=20`

Returns at most 20 active cards due for review, ordered by due time, position,
and card id. The response contains no answer leakage beyond the normal card
detail contract.

### `POST /api/v1/review/{cardId}`

Submits `{ "rating": "AGAIN|HARD|GOOD|EASY", "clientRequestId": "..." }`.
The server uses its current UTC time and returns the resulting schedule. The
same card/request id returns the original transition without applying it twice;
soft-deleted cards are rejected. See
[`docs/learning/fsrs-scheduling.md`](learning/fsrs-scheduling.md).

---

## 7. Exam folder endpoints

### `GET /api/v1/exam-folders`

Returns folder tree and/or root items.

### `POST /api/v1/exam-folders`

Request:

```json
{
  "name": "JLPT N3",
  "parentId": null
}
```

### `PATCH /api/v1/exam-folders/{folderId}`

Updates name, parent, and/or position; hierarchy and cycle validation happen in
the same endpoint.

### `DELETE /api/v1/exam-folders/{folderId}`

Soft delete according to non-empty rules.

---

## 8. Exam CRUD

### `GET /api/v1/exams`

Query:

- `folderId`
- `search`
- `sort`
- `page`
- `limit` (maximum 100)
- `favorite`
- `tag` (normalized slug)

### `POST /api/v1/exams`

Creates exam metadata, optionally with questions in one validated transaction.

### `GET /api/v1/exams/{examId}`

Management/detail endpoint may include correct-answer data only for authenticated editing mode. Do not reuse this response for a live attempt.

### `PATCH /api/v1/exams/{examId}`

Metadata updates.

### `PUT /api/v1/exams/{examId}/content`

Atomically replaces question/option content and increments `contentVersion`.

Content mutation determines whether version increments.

### `DELETE /api/v1/exams/{examId}`

Soft delete.

### `POST /api/v1/exams/{examId}/duplicate`

### `PUT /api/v1/exams/{examId}/favorite`

Sets the favorite state with `{ "favorite": true|false }`. The operation is
idempotent and rejects soft-deleted exams.

`GET /api/v1/exams` accepts optional `favorite=true|false` filtering.

`GET /api/v1/exams` also accepts `tag=<normalized-slug>`. The response contains
a bounded `tags` summary and `PUT /api/v1/exams/{examId}/tags` replaces all
assignments atomically with the same body.

## 8.1 Shared learning tags

### `GET /api/v1/tags?limit=100`

Returns at most 100 normalized flat tag summaries. The server clamps larger
limits.

### `POST /api/v1/tags`

Creates or returns a tag after NFKC/whitespace normalization. Body:

```json
{ "name": "JLPT N3" }
```

Names are at most 32 Unicode code points and the shared vocabulary is capped at
2,000 rows.

### `PATCH /api/v1/tags/{slug}` and `DELETE /api/v1/tags/{slug}`

Rename or delete a tag. Rename preserves existing assignments; delete cascades
only the join rows. Assignments to deleted or soft-deleted learning resources
are rejected, and normal lists continue to exclude soft-deleted resources.

---

## 9. Exam import/export

### `POST /api/v1/imports/exams/preview`

Returns validated metadata/question preview plus short-lived import token.

### `POST /api/v1/imports/exams/confirm`

Consumes import token and creates exam transactionally.

### `GET /api/v1/exams/{examId}/export`

Returns Markdown with answer key at end.

---

## 10. Exam attempt endpoints

### `POST /api/v1/exams/{examId}/attempts`

Starts an attempt.

Response MUST NOT expose correctness flags.

Example:

```json
{
  "attemptId": "...",
  "examId": "...",
  "examVersion": 3,
  "title": "JLPT N3 Grammar Test 01",
  "startedAt": "2026-08-26T00:00:00Z",
  "expiresAt": "2026-08-26T00:30:00Z",
  "questions": [
    {
      "id": "q1",
      "content": "...",
      "options": [
        { "id": "o1", "content": "..." },
        { "id": "o2", "content": "..." }
      ]
    }
  ]
}
```

### `GET /api/v1/attempts/{attemptId}`

Restores current attempt state.

Rules:

- If submitted: return result view payload.
- If expired: server finalizes/marks appropriately.
- If active: return questions/order without correctness.

### `PUT /api/v1/attempts/{attemptId}/answers`

Saves in-progress answer selections and is available for refresh/reconnect
continuity.

Request:

```json
{
  "answers": [{ "questionId": "q1", "selectedOptionId": "o2" }]
}
```

Autosave is recommended because refresh/reconnect should not lose all in-progress selections.

### `POST /api/v1/attempts/{attemptId}/submit`

Request contains final selections or confirms server-saved answers.

Response:

```json
{
  "attemptId": "...",
  "score": 82,
  "correctCount": 41,
  "totalQuestions": 50,
  "durationSeconds": 1120,
  "questions": [
    {
      "questionId": "q1",
      "selectedOptionId": "o2",
      "correctOptionId": "o1",
      "isCorrect": false
    }
  ]
}
```

Submission must be idempotent.

### `GET /api/v1/exam-review/mistakes?limit=20&examId={examId}`

Returns at most 20 incorrect or unanswered items from submitted normal
attempts. It includes prompt/options, selected option, exam version, and source
attempt metadata, but never `isCorrect`, `correctOptionId`, or an answer key.
Deleted exams and old content-version rows are removed while the queue is read.

### `DELETE /api/v1/exam-review/mistakes/{mistakeId}`

Dismisses one queued mistake. `DELETE /api/v1/exam-review/mistakes?examId=...`
clears one exam's queue; without `examId` it clears the complete queue.

### `POST /api/v1/exam-review/practice`

Starts an untimed practice attempt from 1–20 mistake ids:

```json
{ "examId": "...", "mistakeIds": ["..."] }
```

The returned live attempt is marked `isPractice: true` and remains sanitized.
Submitting it uses server grading for feedback but does not create/update an
official best result or add practice mistakes to the queue.

---

## 11. Best result representation

There is no standalone `/api/v1/exams/{examId}/best-result` controller route.
The current exam list/detail DTOs and graded submit response carry the applicable
best-score fields; submit invalidates the corresponding Web query families.

---

## 12. Recent learning

### `GET /api/v1/recent-learning?limit=10`

Returns at most 10 recently accessed, non-deleted flashcard sets and exams for
the current V1 logical user. Repeated access updates the existing row. The
server retains at most 20 rows, omits invalid/deleted targets, and emits a
client-safe resume route for each item.

---

## 13. Search endpoint

Optional consolidated endpoint:

### `GET /api/v1/search?q=改善`

Response sections:

- flashcardSets
- flashcards
- exams
- folders

Alternatively domain list endpoints may handle search independently. Avoid duplicating business logic.

---

## 14. Health endpoint

### `GET /health`

Public liveness check. Returns process status without authentication. The
database-backed readiness check is `GET /health/ready` and returns 503 when the
database is unavailable. Neither route has the `/api/v1` prefix.

Do not expose secrets or unnecessary internals.

---

## 15. Pagination

Current collection response standard:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 120,
  "totalPages": 6
}
```

The API uses `limit` as the request parameter, clamps it to 100, and returns the
`page`, `pageSize`, `total`, and `totalPages` fields shown above.

---

## 16. Validation and status codes

Use:

- 200 successful read/update
- 201 successful create
- 204 optional successful delete
- 400 malformed request
- 401 unauthenticated
- 403 authenticated but forbidden if applicable
- 404 not found
- 409 conflict/duplicate/state conflict
- 413 upload too large
- 422 semantic validation error if adopted project-wide
- 429 rate limit
- 500 unexpected server error

---

## 17. Idempotency

Mandatory for:

- Exam submission
- Import confirmation

Recommended for:

- Duplicate-sensitive create operations initiated from unstable mobile connections

Mechanisms may include:

- Import token one-time consumption
- Attempt status checks
- Idempotency key storage for selected endpoints

---

## 18. API security invariants

- Never expose `is_correct` in live-attempt payloads.
- Management endpoints containing correct answers must not be called by live exam screens.
- Validate ownership/existence of question-option relation on answer submission.
- Reject answers for questions not in the attempt snapshot.
- Enforce server timer.
- Validate every uploaded/imported payload server-side.

## Phase 3 Lookup contracts

The authenticated Lookup API uses the normalized contracts documented in
[`docs/dictionary/contracts.md`](./dictionary/contracts.md). Clients never
receive raw provider payloads and use the stable direction/error enums from
`packages/contracts/src/dictionary.dto.ts`.
