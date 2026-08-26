-- Store submitted incorrect/unanswered questions by exam content version and
-- mark practice attempts so they never update official best results.
ALTER TABLE "exam_attempts"
    ADD COLUMN "is_practice" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "exam_mistakes" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "exam_version" INTEGER NOT NULL,
    "question_id" UUID NOT NULL,
    "source_attempt_id" UUID NOT NULL,
    "selected_option_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exam_mistakes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_mistakes_exam_id_exam_version_question_id_key"
    ON "exam_mistakes"("exam_id", "exam_version", "question_id");

CREATE INDEX "exam_mistakes_exam_id_exam_version_updated_at_idx"
    ON "exam_mistakes"("exam_id", "exam_version", "updated_at");

ALTER TABLE "exam_mistakes"
    ADD CONSTRAINT "exam_mistakes_exam_id_fkey"
    FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_mistakes"
    ADD CONSTRAINT "exam_mistakes_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "exam_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
