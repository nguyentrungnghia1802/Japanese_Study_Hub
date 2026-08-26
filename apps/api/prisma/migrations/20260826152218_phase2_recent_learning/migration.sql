-- CreateEnum
CREATE TYPE "RecentLearningKind" AS ENUM ('FLASHCARD_SET', 'EXAM');

-- CreateTable
CREATE TABLE "recent_learning" (
    "id" UUID NOT NULL,
    "user_key" VARCHAR(255) NOT NULL DEFAULT 'primary_user',
    "kind" "RecentLearningKind" NOT NULL,
    "entity_id" UUID NOT NULL,
    "last_accessed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recent_learning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recent_learning_user_key_last_accessed_at_idx" ON "recent_learning"("user_key", "last_accessed_at");

-- CreateIndex
CREATE UNIQUE INDEX "recent_learning_user_key_kind_entity_id_key" ON "recent_learning"("user_key", "kind", "entity_id");
