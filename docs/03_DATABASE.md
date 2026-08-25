# 03 — Database Specification

## 1. Database choice

- PostgreSQL
- Prisma ORM
- Schema managed through version-controlled migrations
- UTC timestamps in database

---

## 2. General conventions

- Primary keys: UUID or CUID/UUID-compatible generated IDs; choose one convention and keep it consistent.
- Timestamps: `created_at`, `updated_at`, optional `deleted_at`.
- Soft-deleted rows are excluded from normal queries.
- Foreign keys shall be indexed when commonly queried.
- Ordering fields use integer `position`.
- Enums are explicit.

---

## 3. Conceptual ERD

```text
FlashcardSet 1 ───── N Flashcard

ExamFolder 1 ───── N ExamFolder (self-reference)
ExamFolder 1 ───── N Exam
Exam       1 ───── N ExamQuestion
ExamQuestion 1 ─── N ExamOption

Exam 1 ─────────── N ExamAttempt
ExamAttempt 1 ──── N ExamAttemptAnswer
Exam 1 ─────────── N ExamBestResult

QuestionContext 1 ─ N ExamQuestion   (reserved/future-friendly)
```

---

## 4. `flashcard_sets`

Recommended columns:

| Column      | Type         | Null | Notes                    |
| ----------- | ------------ | ---: | ------------------------ |
| id          | UUID         |   no | PK                       |
| title       | varchar/text |   no | bounded                  |
| description | text         |  yes | Markdown/plain text      |
| cover_ref   | text         |  yes | optional media reference |
| created_at  | timestamptz  |   no |                          |
| updated_at  | timestamptz  |   no |                          |
| deleted_at  | timestamptz  |  yes | soft delete              |

Indexes:

- `(deleted_at)` if useful for trash queries
- title search/index strategy as selected

---

## 5. `flashcards`

| Column     | Type        | Null | Notes             |
| ---------- | ----------- | ---: | ----------------- |
| id         | UUID        |   no | PK                |
| set_id     | UUID        |   no | FK flashcard_sets |
| front      | text        |   no | Markdown content  |
| back       | text        |   no | Markdown content  |
| position   | integer     |   no | >= 0              |
| created_at | timestamptz |   no |                   |
| updated_at | timestamptz |   no |                   |
| deleted_at | timestamptz |  yes |                   |

Constraints/indexes:

- Index `(set_id, position)`
- Position uniqueness may be enforced per active set if implementation can maintain safely, otherwise normalize positions transactionally.
- A card has exactly one `set_id`.

---

## 6. `exam_folders`

| Column     | Type        | Null | Notes   |
| ---------- | ----------- | ---: | ------- |
| id         | UUID        |   no | PK      |
| parent_id  | UUID        |  yes | self FK |
| name       | text        |   no |         |
| position   | integer     |   no |         |
| created_at | timestamptz |   no |         |
| updated_at | timestamptz |   no |         |
| deleted_at | timestamptz |  yes |         |

Constraints:

- `parent_id != id`
- Cycles prohibited by service validation
- Maximum effective depth = 2

Indexes:

- `(parent_id, position)`
- optional name search index

---

## 7. `exams`

| Column             | Type        | Null | Notes           |
| ------------------ | ----------- | ---: | --------------- |
| id                 | UUID        |   no | PK              |
| folder_id          | UUID        |  yes | FK exam_folders |
| title              | text        |   no |                 |
| description        | text        |  yes |                 |
| cover_ref          | text        |  yes |                 |
| time_limit_seconds | integer     |  yes | null = untimed  |
| content_version    | integer     |   no | default 1       |
| shuffle_questions  | boolean     |   no | default false   |
| shuffle_options    | boolean     |   no | default false   |
| created_at         | timestamptz |   no |                 |
| updated_at         | timestamptz |   no |                 |
| deleted_at         | timestamptz |  yes |                 |

Constraints:

- `time_limit_seconds > 0` when not null
- `content_version >= 1`

Indexes:

- `(folder_id)`
- title search strategy

---

## 8. `question_contexts`

Reserved future-friendly table.

| Column       | Type        | Null | Notes            |
| ------------ | ----------- | ---: | ---------------- |
| id           | UUID        |   no | PK               |
| exam_id      | UUID        |   no | FK exams         |
| type         | enum        |   no | TEXT/AUDIO/etc.  |
| text_content | text        |  yes | future reading   |
| media_ref    | text        |  yes | future listening |
| position     | integer     |   no |                  |
| created_at   | timestamptz |   no |                  |
| updated_at   | timestamptz |   no |                  |

V1 may create this table but not expose management UI. If the team prefers minimal migration count, it may be deferred as long as `exam_questions.context_id` can be introduced cleanly later.

---

## 9. `exam_questions`

| Column     | Type        | Null | Notes                          |
| ---------- | ----------- | ---: | ------------------------------ |
| id         | UUID        |   no | PK                             |
| exam_id    | UUID        |   no | FK exams                       |
| context_id | UUID        |  yes | reserved/future                |
| type       | enum        |   no | `MULTIPLE_CHOICE_SINGLE` in V1 |
| content    | text        |   no | Markdown                       |
| position   | integer     |   no |                                |
| created_at | timestamptz |   no |                                |
| updated_at | timestamptz |   no |                                |

Indexes:

- `(exam_id, position)`
- `(context_id)` if used

---

## 10. `exam_options`

| Column      | Type        | Null | Notes                      |
| ----------- | ----------- | ---: | -------------------------- |
| id          | UUID        |   no | PK                         |
| question_id | UUID        |   no | FK exam_questions          |
| content     | text        |   no | Markdown                   |
| is_correct  | boolean     |   no | server-only before grading |
| position    | integer     |   no |                            |
| created_at  | timestamptz |   no |                            |
| updated_at  | timestamptz |   no |                            |

Indexes:

- `(question_id, position)`

Cardinality rules 2–6 and exactly-one-correct are enforced transactionally in application/domain validation; optional DB triggers are not required in V1.

---

## 11. `exam_attempts`

| Column                  | Type        | Null | Notes                         |
| ----------------------- | ----------- | ---: | ----------------------------- |
| id                      | UUID        |   no | PK                            |
| exam_id                 | UUID        |   no | FK exams                      |
| exam_version            | integer     |   no | snapshot version              |
| started_at              | timestamptz |   no | server time                   |
| expires_at              | timestamptz |  yes | null for untimed              |
| submitted_at            | timestamptz |  yes |                               |
| status                  | enum        |   no | IN_PROGRESS/SUBMITTED/EXPIRED |
| score                   | numeric     |  yes | after grading                 |
| correct_count           | integer     |  yes | after grading                 |
| total_questions         | integer     |   no | snapshot count                |
| duration_seconds        | integer     |  yes | after submission              |
| question_order_snapshot | jsonb       |  yes | IDs/order when shuffled       |
| option_order_snapshot   | jsonb       |  yes | stable shuffled option order  |
| created_at              | timestamptz |   no |                               |
| updated_at              | timestamptz |   no |                               |

Notes:

- The snapshots may instead be normalized into attempt item tables if desired. JSONB is acceptable at V1 personal scale if strictly validated.
- Submission must be idempotent.

---

## 12. `exam_attempt_answers`

| Column             | Type        | Null | Notes             |
| ------------------ | ----------- | ---: | ----------------- |
| id                 | UUID        |   no | PK                |
| attempt_id         | UUID        |   no | FK exam_attempts  |
| question_id        | UUID        |   no |                   |
| selected_option_id | UUID        |  yes | null = unanswered |
| is_correct         | boolean     |  yes | set on grading    |
| created_at         | timestamptz |   no |                   |
| updated_at         | timestamptz |   no |                   |

Constraints:

- Unique `(attempt_id, question_id)`

Retention policy:

- Full lower-score attempt answers may be deleted after grading if V1 deliberately chooses “best result only” storage.
- Recommended V1 implementation: retain only the active attempt while in progress; after grading, persist complete result long enough to display it, then allow cleanup policy. Preserve best result summary separately.

---

## 13. `exam_best_results`

| Column           | Type        | Null | Notes                 |
| ---------------- | ----------- | ---: | --------------------- |
| id               | UUID        |   no | PK                    |
| exam_id          | UUID        |   no | FK exams              |
| exam_version     | integer     |   no |                       |
| user_key         | text        |   no | V1 logical user key   |
| best_score       | numeric     |   no | 0..100                |
| correct_count    | integer     |   no |                       |
| total_questions  | integer     |   no |                       |
| duration_seconds | integer     |  yes | best attempt duration |
| attempt_count    | integer     |   no | >= 1                  |
| achieved_at      | timestamptz |   no |                       |
| last_attempt_at  | timestamptz |   no |                       |
| created_at       | timestamptz |   no |                       |
| updated_at       | timestamptz |   no |                       |

Constraints:

- Unique `(user_key, exam_id, exam_version)`

Future migration:

- Replace/add `user_id` foreign key when multi-user system is introduced.

---

## 14. Optional `import_sessions`

Recommended for safe two-step preview/confirm.

Columns:

- id
- type (`FLASHCARD_SET`, `EXAM`)
- payload_hash
- normalized_payload JSONB or server cache reference
- expires_at
- consumed_at
- created_at

Rules:

- Short expiry
- One-time consume
- Confirm revalidates critical constraints

---

## 15. Soft deletion

Normal queries shall filter `deleted_at IS NULL`.

For parent entities:

- Deleting a flashcard set hides its cards.
- Deleting an exam folder requires explicit behavior for child folders/exams.

Recommended folder delete behavior:

- Reject deletion if non-empty unless user chooses recursive soft-delete.
- Recursive delete must be transactional.

---

## 16. Exam content version transaction

When content changes:

```text
BEGIN
  validate new content
  update questions/options
  increment exams.content_version
COMMIT
```

No partial content change is allowed.

---

## 17. Best score update transaction

Submission transaction should:

1. Lock/finalize attempt safely.
2. Calculate score.
3. Increment attempt count.
4. Upsert best result only if score is higher, or apply tie policy.
5. Commit.

Avoid race conditions from duplicate submit requests.

---

## 18. Search indexes

At personal scale, simple PostgreSQL indexes are sufficient.

Potential strategies:

- `pg_trgm` for flexible title/content search
- PostgreSQL full-text where language behavior fits
- ILIKE with appropriate indexes for small datasets

Choose one implementation and document migrations.

---

## 19. Migration rules

- Never edit an already-applied production migration.
- Add a new migration.
- Test migrations from an empty database.
- Test upgrades from the latest prior schema when practical.
- Destructive migration requires backup and explicit review.
