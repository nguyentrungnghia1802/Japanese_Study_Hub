-- Extend the Phase 2 mistake table with immutable submitted-review snapshots.
-- The existing table is reused so current queue/practice behavior can migrate
-- without introducing a second source of mistake data.
ALTER TABLE "exam_mistakes"
    ADD COLUMN "user_key" VARCHAR(255) NOT NULL DEFAULT 'primary_user',
    ADD COLUMN "question_type_snapshot" "QuestionType",
    ADD COLUMN "question_content_snapshot" TEXT,
    ADD COLUMN "option_snapshot" JSONB,
    ADD COLUMN "question_position" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "correct_option_id" UUID,
    ADD COLUMN "is_correct" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "is_unanswered" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "submitted_at" TIMESTAMPTZ(6);

-- Phase 2 did not constrain source attempts. Remove only orphaned legacy rows
-- before making the historical snapshot and source-attempt relationship strict;
-- there is no trustworthy submitted snapshot to reconstruct for such rows.
DELETE FROM "exam_mistakes" AS m
WHERE NOT EXISTS (
    SELECT 1
    FROM "exam_attempts" AS a
    WHERE a."id" = m."source_attempt_id"
)
   OR NOT EXISTS (
    SELECT 1
    FROM "exam_questions" AS q
    WHERE q."id" = m."question_id"
);

UPDATE "exam_mistakes" AS m
SET
    "user_key" = COALESCE(a."user_key", 'primary_user'),
    "question_type_snapshot" = q."type",
    "question_content_snapshot" = q."content",
    "option_snapshot" = COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', o."id"::text,
                    'content', o."content",
                    'position', o."position"
                ) ORDER BY o."position"
            )
            FROM "exam_options" AS o
            WHERE o."question_id" = q."id"
        ),
        '[]'::jsonb
    ),
    "question_position" = q."position",
    "correct_option_id" = (
        SELECT o."id"
        FROM "exam_options" AS o
        WHERE o."question_id" = q."id" AND o."is_correct" = true
        ORDER BY o."position"
        LIMIT 1
    ),
    "is_correct" = false,
    "is_unanswered" = (m."selected_option_id" IS NULL),
    "submitted_at" = COALESCE(a."submitted_at", m."updated_at")
FROM "exam_questions" AS q, "exam_attempts" AS a
WHERE q."id" = m."question_id"
  AND a."id" = m."source_attempt_id";

ALTER TABLE "exam_mistakes"
    ALTER COLUMN "question_type_snapshot" SET NOT NULL,
    ALTER COLUMN "question_content_snapshot" SET NOT NULL,
    ALTER COLUMN "option_snapshot" SET NOT NULL,
    ALTER COLUMN "submitted_at" SET NOT NULL;

DROP INDEX "exam_mistakes_exam_id_exam_version_question_id_key";

ALTER TABLE "exam_mistakes"
    DROP CONSTRAINT "exam_mistakes_question_id_fkey";

ALTER TABLE "exam_mistakes"
    ADD CONSTRAINT "exam_mistakes_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "exam_questions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "exam_mistakes"
    ADD CONSTRAINT "exam_mistakes_source_attempt_id_fkey"
    FOREIGN KEY ("source_attempt_id") REFERENCES "exam_attempts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "exam_mistakes_source_attempt_id_question_id_key"
    ON "exam_mistakes"("source_attempt_id", "question_id");

CREATE INDEX "exam_mistakes_user_key_exam_id_exam_version_submitted_at_idx"
    ON "exam_mistakes"("user_key", "exam_id", "exam_version", "submitted_at");

CREATE INDEX "exam_mistakes_source_attempt_id_question_position_idx"
    ON "exam_mistakes"("source_attempt_id", "question_position");
