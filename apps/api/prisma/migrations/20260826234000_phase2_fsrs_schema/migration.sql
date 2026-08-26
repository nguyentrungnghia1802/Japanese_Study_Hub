-- Additive server-authoritative FSRS state and bounded review audit.
CREATE TYPE "FlashcardScheduleState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'RELEARNING');
CREATE TYPE "FlashcardReviewRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

ALTER TABLE "flashcards"
    ADD COLUMN "fsrs_state" "FlashcardScheduleState" NOT NULL DEFAULT 'NEW',
    ADD COLUMN "fsrs_due_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "fsrs_stability" DOUBLE PRECISION,
    ADD COLUMN "fsrs_difficulty" DOUBLE PRECISION,
    ADD COLUMN "fsrs_elapsed_days" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "fsrs_scheduled_days" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "fsrs_reps" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "fsrs_lapses" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "fsrs_last_reviewed_at" TIMESTAMPTZ(6);

CREATE TABLE "flashcard_review_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "flashcard_id" UUID NOT NULL,
    "client_request_id" VARCHAR(128) NOT NULL,
    "rating" "FlashcardReviewRating" NOT NULL,
    "state_before" "FlashcardScheduleState" NOT NULL,
    "state_after" "FlashcardScheduleState" NOT NULL,
    "reviewed_at" TIMESTAMPTZ(6) NOT NULL,
    "due_at_before" TIMESTAMPTZ(6) NOT NULL,
    "due_at_after" TIMESTAMPTZ(6) NOT NULL,
    "scheduled_days" INTEGER NOT NULL,
    "stability" DOUBLE PRECISION,
    "difficulty" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_review_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "flashcard_review_logs_flashcard_id_client_request_id_key"
    ON "flashcard_review_logs"("flashcard_id", "client_request_id");
CREATE INDEX "flashcards_deleted_at_fsrs_due_at_idx"
    ON "flashcards"("deleted_at", "fsrs_due_at");
CREATE INDEX "flashcard_review_logs_flashcard_id_reviewed_at_idx"
    ON "flashcard_review_logs"("flashcard_id", "reviewed_at");

ALTER TABLE "flashcard_review_logs"
    ADD CONSTRAINT "flashcard_review_logs_flashcard_id_fkey"
    FOREIGN KEY ("flashcard_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
