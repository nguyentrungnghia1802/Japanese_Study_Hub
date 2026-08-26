# Prisma query and index audit

Status: completed for TASK-233, 2026-08-26

## Scope

The audit covered the common reads used by Dashboard, Flashcards, Exams, Search,
and the current best-result lookup. The source review found no core N+1 loop:

- Dashboard runs bounded recent-set/recent-exam/count/best-result queries in
  parallel. Recent entries are limited to 4/4/5.
- Flashcard and exam collection queries use one bounded `findMany` plus one
  count; nested cards/questions are not included in collection responses.
- Exam collection uses one bounded best-result include (`take: 1`) per collection
  query rather than a follow-up request per card.
- Search executes four bounded domain queries in parallel; each domain is capped
  at 30. Detail routes intentionally use one nested Prisma read for their
  bounded content tree.

## EXPLAIN evidence

`EXPLAIN (ANALYZE, BUFFERS)` was run against PostgreSQL 16.8 on the migrated
local database for active-set ordering, active-exam ordering, Japanese card
search, best-result lookup, and Dashboard recent ordering. The plans completed
without errors and used the existing `deleted_at` indexes for active set/exam
reads, the composite `user_key, exam_id, exam_version` unique index for the
best-result lookup, and the existing `deleted_at` index for the bounded card
search. The text search predicates use `ILIKE '%…%'`; a B-tree cannot accelerate
that pattern, so a trigram index is not added speculatively.

The empty/temporary local dataset produced sub-millisecond to low-millisecond
execution and a small sort for the bounded result sets. A larger production
dataset should be re-measured before adding partial ordering indexes. This is an
intentional “no unjustified index” result, not a claim that every future dataset
has the same plan.

## Migration safety

The applied V1 migration `20260826000000_init` was not edited. `prisma migrate
deploy` reported no pending migration against the current local database. A
separate temporary PostgreSQL database was created, migrated from the repository
history, verified successfully, and removed after the check. No TASK-233 schema
change was justified, so no additional migration was created.

Future index changes must include a new timestamped migration, a representative
`EXPLAIN (ANALYZE, BUFFERS)` result, and an upgrade plus fresh-database check.
