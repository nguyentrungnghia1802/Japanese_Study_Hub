-- Phase 3 bounded, server-owned lookup history.  Only normalized metadata is
-- retained; provider payloads remain response-cache data and are not persisted.
CREATE TYPE "DictionaryLookupDirection" AS ENUM ('JA_TO_VI', 'VI_TO_JA');

CREATE TABLE "dictionary_lookup_history" (
    "id" UUID NOT NULL,
    "user_key" VARCHAR(255) NOT NULL DEFAULT 'primary_user',
    "query" VARCHAR(120) NOT NULL,
    "direction" "DictionaryLookupDirection" NOT NULL,
    "primary_label" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dictionary_lookup_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dictionary_lookup_history_user_key_query_direction_key"
    ON "dictionary_lookup_history"("user_key", "query", "direction");

CREATE INDEX "dictionary_lookup_history_user_key_created_at_idx"
    ON "dictionary_lookup_history"("user_key", "created_at");
