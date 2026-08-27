-- Phase 3 compact favorites. Source metadata is flattened and bounded so a
-- favorite can be reopened without retaining raw provider documents.
CREATE TABLE "dictionary_favorites" (
    "id" UUID NOT NULL,
    "user_key" VARCHAR(255) NOT NULL DEFAULT 'primary_user',
    "term" VARCHAR(120) NOT NULL,
    "reading" VARCHAR(120) NOT NULL DEFAULT '',
    "meaning_summary" VARCHAR(512) NOT NULL,
    "direction" "DictionaryLookupDirection" NOT NULL,
    "source_provider" VARCHAR(32) NOT NULL,
    "source_name" VARCHAR(128) NOT NULL,
    "source_url" VARCHAR(512) NOT NULL,
    "source_license" VARCHAR(128),
    "source_attribution" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dictionary_favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dictionary_favorites_user_key_term_direction_reading_key"
    ON "dictionary_favorites"("user_key", "term", "direction", "reading");

CREATE INDEX "dictionary_favorites_user_key_created_at_idx"
    ON "dictionary_favorites"("user_key", "created_at");
