# 04 — API Specification

## 1. API style

- REST
- JSON
- HTTPS in production
- OpenAPI-generated documentation
- Version prefix: `/api/v1`

---

## 2. Common response rules

Success responses should use direct resource payloads or a consistent envelope. Choose one project-wide convention.

Recommended error envelope:

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

- Authentication/session payload
- Never return password/hash/secrets

Errors:

- 400 invalid payload
- 401 invalid credentials
- 429 rate limited

### `POST /api/v1/auth/logout`

Invalidates/removes session as applicable.

### `GET /api/v1/auth/me`

Returns minimal authenticated identity/session information.

---

## 4. Flashcard set endpoints

### `GET /api/v1/flashcard-sets`

Query:

- `q`
- `sort`
- `page`
- `pageSize`

### `POST /api/v1/flashcard-sets`

Creates a set.

### `GET /api/v1/flashcard-sets/{setId}`

Returns set detail and optionally paginated cards.

### `PATCH /api/v1/flashcard-sets/{setId}`

Metadata update.

### `DELETE /api/v1/flashcard-sets/{setId}`

Soft delete.

### `POST /api/v1/flashcard-sets/{setId}/restore`

Optional if Trash is surfaced.

### `POST /api/v1/flashcard-sets/{setId}/duplicate`

Creates a copy with duplicated cards.

### `PUT /api/v1/flashcard-sets/{setId}/favorite`

Sets the favorite state with `{ "favorite": true|false }`. The operation is
idempotent and rejects soft-deleted sets.

`GET /api/v1/flashcard-sets` accepts optional `favorite=true|false` filtering.

---

## 5. Flashcard endpoints

### `POST /api/v1/flashcard-sets/{setId}/cards`

### `PATCH /api/v1/flashcards/{cardId}`

### `DELETE /api/v1/flashcards/{cardId}`

### `POST /api/v1/flashcards/{cardId}/duplicate`

### `PUT /api/v1/flashcard-sets/{setId}/cards/order`

Request example:

```json
{
  "cardIds": ["id1", "id2", "id3"]
}
```

Backend validates ownership and full order semantics.

---

## 6. Flashcard import/export

### `POST /api/v1/imports/flashcards/preview`

Multipart upload:

- `.md` only
- enforce size limit

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
  "duplicatePolicy": "CREATE_NEW"
}
```

Response: created set.

### `GET /api/v1/flashcard-sets/{setId}/export`

Returns Markdown file response.

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

Rename/move metadata.

### `PUT /api/v1/exam-folders/{folderId}/move`

Explicit move endpoint is recommended if hierarchy validation is complex.

### `DELETE /api/v1/exam-folders/{folderId}`

Soft delete according to non-empty rules.

---

## 8. Exam CRUD

### `GET /api/v1/exams`

Query:

- `folderId`
- `q`
- `sort`
- `page`
- `pageSize`

### `POST /api/v1/exams`

Creates exam metadata, optionally with questions in one validated transaction.

### `GET /api/v1/exams/{examId}`

Management/detail endpoint may include correct-answer data only for authenticated editing mode. Do not reuse this response for a live attempt.

### `PATCH /api/v1/exams/{examId}`

Metadata updates.

### `PUT /api/v1/exams/{examId}/content`

Recommended endpoint for atomic question/option content replacement/update.

Content mutation determines whether version increments.

### `DELETE /api/v1/exams/{examId}`

Soft delete.

### `POST /api/v1/exams/{examId}/duplicate`

### `PUT /api/v1/exams/{examId}/favorite`

Sets the favorite state with `{ "favorite": true|false }`. The operation is
idempotent and rejects soft-deleted exams.

`GET /api/v1/exams` accepts optional `favorite=true|false` filtering.

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

### `GET /api/v1/exam-attempts/{attemptId}`

Restores current attempt state.

Rules:

- If submitted: return result view payload.
- If expired: server finalizes/marks appropriately.
- If active: return questions/order without correctness.

### `PUT /api/v1/exam-attempts/{attemptId}/answers`

Optional autosave endpoint.

Request:

```json
{
  "answers": [{ "questionId": "q1", "selectedOptionId": "o2" }]
}
```

Autosave is recommended because refresh/reconnect should not lose all in-progress selections.

### `POST /api/v1/exam-attempts/{attemptId}/submit`

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

---

## 11. Best result endpoints

### `GET /api/v1/exams/{examId}/best-result`

Returns best result for current exam version.

If none exists, return `null` result with 200 or consistent 404 policy.

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

Returns basic process/database readiness status suitable for deployment checks.

Do not expose secrets or unnecessary internals.

---

## 15. Pagination

Recommended standard:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 120,
  "totalPages": 6
}
```

Set maximum `pageSize`.

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
