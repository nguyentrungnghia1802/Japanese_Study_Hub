# API payload audit

Status: implemented for TASK-232, 2026-08-26

Collection endpoints now return purpose-specific bounded items. Flashcard-set
and exam list responses never include card/question/option trees; those remain on
detail or live-attempt routes. Exam list items also omit management shuffle flags
that collection UIs do not use. Search remains grouped and is capped at 30 items
per domain. Markdown is produced only by explicit export routes, never by a list.

Both collection endpoints return the contract fields `page`, `pageSize`,
`total`, and `totalPages`; the Android response model was updated from the old
`limit` name. The API still accepts the V1 `limit` query parameter (capped at
100), so existing callers remain compatible while the response contract is
consistent.

The management DTOs (`ExamDto` with questions/options and `FlashcardSetDto` with
optional cards) remain separate from the live-attempt DTOs, whose runtime guard
rejects correctness metadata. Search and collection limits are clamped in both
controller and service layers so direct service calls cannot bypass the bound.

The payload gate is covered by contract/type checks, API service tests, and the
live API smoke suite. Any future collection field must be justified against the
list UI before being added.
