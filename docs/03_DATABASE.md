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

RecentLearning N ─── 1 FlashcardSet or Exam (polymorphic, validated by API)

DictionaryLookupHistory N ─── 1 logical user
DictionaryFavorite N ─────── 1 logical user

FlashcardSet N ─── N Tag (FlashcardSetTag)
Exam N ────────── N Tag (ExamTag)
```

### 3.1 `recent_learning`

Phase 2 adds a bounded resume projection for the V1 logical user. It stores
`user_key`, `kind`, `entity_id`, and `last_accessed_at`, with a unique key on
`(user_key, kind, entity_id)` and an index on `(user_key, last_accessed_at)`.
The API retains at most 20 rows and returns at most 10. `entity_id` is
intentionally polymorphic because the single-user V1 model has no shared content
parent; reads validate the target against the active, non-deleted set or exam.

### 3.2 bounded flat tags

Phase 2 adds `tags`, `flashcard_set_tags`, and `exam_tags`. `tags.slug` is
unique, names are normalized by the API, and join-table composite primary keys
prevent duplicate assignments. The join foreign keys cascade on deletion. The
API enforces a maximum of 32 Unicode code points per name, 20 tags per active
resource, and 2,000 shared tag rows; there is intentionally no hierarchy.

### 3.3 Applied Phase 2 schema

The checked-in Prisma schema is the current database contract. The migration
chain is:

1. `20260826000000_init`
2. `20260826152218_phase2_recent_learning`
3. `20260826223000_phase2_favorites`
4. `20260826230000_phase2_tags`
5. `20260826234000_phase2_fsrs_schema`
6. `20260826235000_phase2_fsrs_review_snapshots`
7. `20260827000000_phase2_exam_review`
8. `20260827010000_phase3_dictionary_history`
9. `20260827011000_phase3_dictionary_favorites`

The Phase 2 additions are `recent_learning`, `tags`, `flashcard_set_tags`,
`exam_tags`, `flashcard_review_logs`, and `exam_mistakes`; Phase 3 adds
`dictionary_lookup_history` and `dictionary_favorites`; favorite flags are on
`flashcard_sets` and `exams`; FSRS state/snapshot fields are on `flashcards` and
`flashcard_review_logs`; and `is_practice` is on `exam_attempts`. The applied
unique keys and indexes include:

- `recent_learning (user_key, kind, entity_id)` unique and
  `(user_key, last_accessed_at)`;
- `flashcard_review_logs (flashcard_id, client_request_id)` unique and
  `(flashcard_id, reviewed_at)`;
- `exam_mistakes (exam_id, exam_version, question_id)` unique and
  `(exam_id, exam_version, updated_at)`;
- `tags.slug` unique, `tags.name` indexed, and reverse `tag_id` indexes on both
  join tables;
- `(deleted_at, fsrs_due_at)` on `flashcards` for bounded active due-card reads;
- `(exam_id, user_key)` on `exam_attempts` and
  `(user_key, exam_id, exam_version)` unique on `exam_best_results`;
- `(user_key, query, direction)` unique on `dictionary_lookup_history` and
  `(user_key, term, direction, reading)` unique on `dictionary_favorites`.

Fresh-database and V1-to-Phase-2/3 migration verification is performed by
`scripts/verify-phase2-migrations.ps1` and must continue to assert this chain.

### 3.4 Phase 3 dictionary retention

`dictionary_lookup_history` stores at most 100 normalized rows for the V1
logical user. It contains only the query, resolved direction, optional primary
label, and timestamp; raw provider responses are never persisted. Repeating a
query in the same direction updates its timestamp through the unique key, and
older rows are pruned after each write.

`dictionary_favorites` stores a flattened reopen projection: term, reading,
Vietnamese meaning summary, resolved direction, and bounded source attribution
fields. It intentionally excludes raw provider payloads and is returned in
bounded pages of at most 100 items.

---

## 4. `flashcard_sets`

Recommended columns:

| Column      | Type         | Null | Notes                    |
| ----------- | ------------ | ---: | ------------------------ |
| id          | UUID         |   no | PK                       |
| title       | varchar/text |   no | bounded                  |
| description | text         |  yes | Markdown/plain text      |
| cover_ref   | text         |  yes | optional media reference |
| is_favorite | boolean      |   no | default false            |
| created_at  | timestamptz  |   no |                          |
| updated_at  | timestamptz  |   no |                          |
| deleted_at  | timestamptz  |  yes | soft delete              |

Indexes:

- `(deleted_at)` if useful for trash queries
- title search/index strategy as selected

Set DTOs expose only bounded tag summaries. Tag filtering resolves the unique
normalized slug through `flashcard_set_tags`.

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
- Index `(deleted_at, fsrs_due_at)` for active due-card queries.
- Position uniqueness may be enforced per active set if implementation can maintain safely, otherwise normalize positions transactionally.
- A card has exactly one `set_id`.

### 5.1 FSRS scheduling fields

Phase 2 adds `fsrs_state` (`NEW`, `LEARNING`, `REVIEW`, or `RELEARNING`), UTC
`fsrs_due_at`, nullable stability/difficulty, elapsed and scheduled days,
short-term learning step, repetition and lapse counters, and nullable
`fsrs_last_reviewed_at`. Existing cards are initialized as new cards with an
immediate due time.

`flashcard_review_logs` stores the server transition audit, including the
client request id, rating, before/after state and due time, reviewed time, and
resulting stability/difficulty. It has a unique key on
`(flashcard_id, client_request_id)` and an index on `(flashcard_id,
reviewed_at)`. Logs are bounded to 365 days and 500 rows per card by the review
service.

Migration `20260826235000_phase2_fsrs_review_snapshots` adds the persisted
short-term learning step and post-review counters used when replaying an
idempotent request.

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
| is_favorite        | boolean     |   no | default false   |
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

Exam DTOs expose the same bounded shared tag summaries. Tag filtering resolves
the unique normalized slug through `exam_tags`.

## 7.1 `tags` and assignment tables

`tags` stores the shared normalized `slug` and display `name`; `slug` is unique
and `name` is indexed for bounded library pickers. `flashcard_set_tags` and
`exam_tags` use `(set_id, tag_id)` and `(exam_id, tag_id)` composite primary
keys, plus reverse `tag_id` indexes. All four foreign keys cascade. The API
enforces 32 code points per name, 20 tags per resource, and 2,000 tag rows.

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

| Column                  | Type        | Null | Notes                                                |
| ----------------------- | ----------- | ---: | ---------------------------------------------------- |
| id                      | UUID        |   no | PK                                                   |
| exam_id                 | UUID        |   no | FK exams                                             |
| exam_version            | integer     |   no | snapshot version                                     |
| started_at              | timestamptz |   no | server time                                          |
| expires_at              | timestamptz |  yes | null for untimed                                     |
| submitted_at            | timestamptz |  yes |                                                      |
| status                  | enum        |   no | IN_PROGRESS/SUBMITTED/EXPIRED                        |
| score                   | numeric     |  yes | after grading                                        |
| correct_count           | integer     |  yes | after grading                                        |
| total_questions         | integer     |   no | snapshot count                                       |
| duration_seconds        | integer     |  yes | after submission                                     |
| question_order_snapshot | jsonb       |  yes | IDs/order when shuffled                              |
| option_order_snapshot   | jsonb       |  yes | stable shuffled option order                         |
| is_practice             | boolean     |   no | default false; excludes official best/mistake writes |
| created_at              | timestamptz |   no |                                                      |
| updated_at              | timestamptz |   no |                                                      |

Notes:

- The snapshots may instead be normalized into attempt item tables if desired. JSONB is acceptable at V1 personal scale if strictly validated.
- Submission must be idempotent.

## 11.1 `exam_mistakes`

Phase 3 extends the Phase 2 table rather than creating a parallel review model.
Each row is one wrong or unanswered question from one official submitted
attempt. Detailed rows are retained only for the three newest official
attempts in the same `(user_key, exam_id, exam_version)` scope. Practice
attempts never create rows and best-result summaries are independent.

| Column             | Type        | Null | Notes                       |
| ------------------ | ----------- | ---: | --------------------------- |
| id                 | UUID        |   no | PK                          |
| user_key           | varchar(255) | no | logical-user retention scope |
| exam_id            | UUID         | no | FK exams                     |
| exam_version       | integer      | no | content version boundary     |
| question_id        | UUID         | no | stable question identifier   |
| source_attempt_id  | UUID         | no | FK submitted attempt         |
| question_type      | enum         | no | type snapshot                |
| question_content   | text         | no | prompt snapshot              |
| option_snapshot    | JSONB        | no | ordered options for review   |
| question_position  | integer      | no | historical display order     |
| selected_option_id | UUID         | yes | null = unanswered            |
| correct_option_id  | UUID         | yes | graded answer snapshot       |
| is_correct         | boolean      | no | always false for retained row |
| is_unanswered      | boolean      | no | explicit unanswered state    |
| submitted_at       | timestamptz  | no | source server submit time    |
| created_at         | timestamptz  | no |                              |
| updated_at         | timestamptz  | no |                              |

Unique key `(source_attempt_id, question_id)` makes duplicate finalization
idempotent while allowing the same question to appear in multiple retained
attempts. Indexes cover `(user_key, exam_id, exam_version, submitted_at)` and
`source_attempt_id`. The question foreign key is restrictive so a hard delete
cannot silently destroy a retained snapshot; content is rendered from the
snapshot. Normal API history surfaces only the current exam content version;
older-version rows remain isolated and are never mixed into current review.

The API queue projects the newest retained row per current-version question,
while the Last-3 API returns rows for one selected official attempt. All
snapshot data is created in the official finalization transaction and rows
outside the newest three submitted attempts are deleted in that same scope.

---

## 11.2 Android Room read cache

The Android client keeps a local, non-authoritative Room projection for
read-mostly summaries only. The cache contains flashcard-set summaries, exam
summaries, recent/resume metadata, and dashboard counts. It deliberately does
not contain live attempts, graded answers, FSRS transitions, or pre-grading
correctness metadata.

Cache policy:

- maximum 100 rows per bounded summary projection;
- maximum seven-day age, with expired-row cleanup before reads;
- cached rows are replaced by server data after refresh;
- stale/offline state is visible in the UI;
- no pending mutation queue or bidirectional offline synchronization.

The server remains the source of truth. Cache failures are best-effort and
must not make a successful network response fail.

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

## 14. `import_sessions`

The initial migration creates `import_sessions` for the implemented two-step
preview/confirm import flow.

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
