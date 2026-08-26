-- Additive Phase 2 favorite state for the two user-owned learning domains.
ALTER TABLE "flashcard_sets"
ADD COLUMN "is_favorite" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "exams"
ADD COLUMN "is_favorite" BOOLEAN NOT NULL DEFAULT false;
