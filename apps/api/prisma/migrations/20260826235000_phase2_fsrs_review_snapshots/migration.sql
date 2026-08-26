-- Persist the short-term FSRS step and the complete post-review snapshot so
-- idempotent retries can return the original transition.
ALTER TABLE "flashcards"
    ADD COLUMN "fsrs_learning_steps" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "flashcard_review_logs"
    ADD COLUMN "elapsed_days" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "learning_steps" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "reps" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "lapses" INTEGER NOT NULL DEFAULT 0;
