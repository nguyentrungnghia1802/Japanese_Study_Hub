-- Additive bounded flat tags for flashcard sets and exams.
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(64) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "flashcard_set_tags" (
    "set_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_set_tags_pkey" PRIMARY KEY ("set_id", "tag_id")
);

CREATE TABLE "exam_tags" (
    "exam_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_tags_pkey" PRIMARY KEY ("exam_id", "tag_id")
);

CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");
CREATE INDEX "tags_name_idx" ON "tags"("name");
CREATE INDEX "flashcard_set_tags_tag_id_idx" ON "flashcard_set_tags"("tag_id");
CREATE INDEX "exam_tags_tag_id_idx" ON "exam_tags"("tag_id");

ALTER TABLE "flashcard_set_tags"
    ADD CONSTRAINT "flashcard_set_tags_set_id_fkey"
    FOREIGN KEY ("set_id") REFERENCES "flashcard_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "flashcard_set_tags"
    ADD CONSTRAINT "flashcard_set_tags_tag_id_fkey"
    FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_tags"
    ADD CONSTRAINT "exam_tags_exam_id_fkey"
    FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_tags"
    ADD CONSTRAINT "exam_tags_tag_id_fkey"
    FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
