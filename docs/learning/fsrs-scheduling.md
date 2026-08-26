# FSRS scheduling

Phase 2 adopts server-authoritative FSRS scheduling for flashcards. The public
ratings are `AGAIN`, `HARD`, `GOOD`, and `EASY`; the basic Study All/Shuffle
mode remains available and does not mutate FSRS state.

## State and deterministic transition

Each active card has one schedule state: `NEW`, `LEARNING`, `REVIEW`, or
`RELEARNING`. The server stores the due time, stability, difficulty, elapsed
days, scheduled days, short-term learning step, repetitions, lapses, and
last-reviewed time.

The scheduler is a pure domain operation. Given the card's current schedule,
one rating, and the server review time, it produces the next state and schedule
without reading client time or client-provided intervals. A new card is due
immediately. Review timestamps and due timestamps are stored in UTC.

The review queue excludes soft-deleted cards, is capped at 20 cards per
request, and is ordered by due time, then position, then card id. Dashboard
counts are computed against the server's current UTC time:

- `dueCount`: active cards whose due time is at or before server now;
- `newCount`: active cards in `NEW` state;
- `reviewCount`: active cards in `REVIEW` state.

V1 users have no profile timezone, so day boundaries use UTC. An IANA timezone
may be introduced only with an explicit product decision and persisted user
setting; clients must not send a timezone to change scheduling.

## Editing and deletion

Changing a card's front or back resets its schedule to `NEW`, sets due time to
server now, clears stability/difficulty, and resets elapsed days, scheduled
days, repetitions, and lapses. Position-only changes do not reset scheduling.
Existing review logs remain bounded audit history. Soft-deleted cards are
excluded from queues and counts but can be restored with their schedule; hard
deletion cascades its review logs.

## Review idempotency and retention

Every review writes a log containing the client request id, rating, before and
after states, server review time, before and after due times, scheduled days,
stability, and difficulty. The pair `(flashcard_id, client_request_id)` is
unique. Retrying the same request returns the original transition and does not
advance the schedule a second time.

Review logs are retained for at most 365 days and at most 500 rows per card.
Pruning is bounded and removes the oldest rows after a successful review.

## Migration

Migrations `20260826234000_phase2_fsrs_schema` and
`20260826235000_phase2_fsrs_review_snapshots` are additive. Existing cards are
initialized as `NEW` with an immediate due time and zero counters, so the V1
content remains usable while the first review establishes its schedule. The
second migration persists the short-term learning step and complete post-review
counter snapshot needed for exact idempotent replay.
