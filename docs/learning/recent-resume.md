# Recent and resume learning

TASK-240 keeps a small, server-owned resume list for the single V1 logical user.
It is intentionally a bounded projection, not an event log or an offline sync
store.

## Storage policy

`recent_learning` stores one row per `(user_key, kind, entity_id)` and updates
`last_accessed_at` on access. The API keeps at most 20 rows for the logical user
and returns at most 10 rows to clients. The composite unique key makes repeated
opens idempotent; overflow rows are deleted immediately after an upsert.

`entity_id` is polymorphic because the V1 user model has no shared content
table. The API resolves the ID against the appropriate non-deleted flashcard
set or exam before returning it. Missing, invalid, or soft-deleted content is
omitted from the response.

## Access signals

- `GET /flashcard-sets/:id` records a flashcard-set access after the normal
  non-deleted detail lookup succeeds.
- `GET /exams/:id` records an exam access after the normal detail lookup
  succeeds.
- `POST /exams/:id/attempts` records an exam access after an attempt is
  successfully created.
- `GET /recent-learning?limit=10` returns bounded resume items with a safe
  client route, title, counts, and UTC access timestamp.

Dashboard reads include the same `recentLearning` projection. Web links open
the specific flashcard study or exam route. Android displays the same recent
items and provides a domain-level open action while preserving the existing
navigation surface.

## Validation

The API unit tests cover idempotent upsert, overflow deletion, ordering, the
20-row storage bound, and exclusion of deleted or missing content. The migration
is additive and preserves the V1 table defaults.
