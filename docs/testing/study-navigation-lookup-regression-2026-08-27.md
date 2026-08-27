# Study navigation and Lookup regression verification — 2026-08-27

## Scope

This verification covers the maintenance fixes for the Web study areas:

- Flashcard study/review uses the wider, taller shared flip card.
- Review is exposed as a subsection of Flashcards.
- Mistakes is exposed as a subsection of Exams and the global queue is grouped
  by Exam/content version.
- Official mistake retention remains scoped to user, Exam, and content version;
  only the newest three official submitted attempts are retained. Practice
  attempts remain outside that window.
- Dictionary Lookup submits from both the button and Enter, while history or
  favorites failures remain non-blocking for core lookup.

## Automated verification

| Check                                            | Result                                                                                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @japanese-learning/web test`      | 24 files, 55 tests passed                                                                                                     |
| `pnpm --filter @japanese-learning/web typecheck` | Passed                                                                                                                        |
| `pnpm --filter @japanese-learning/web lint`      | Passed; no warnings/errors                                                                                                    |
| `pnpm --filter @japanese-learning/api test`      | 32 files, 163 tests passed; 4 integration tests skipped because the package test command does not enable the integration gate |
| `pnpm --filter @japanese-learning/api typecheck` | Passed                                                                                                                        |
| `pnpm --filter @japanese-learning/api lint`      | Passed                                                                                                                        |

The existing API unit coverage includes transactional last-three pruning and
an explicit assertion that pruning an attempt in one Exam does not delete
mistakes from another Exam or content version. The new Web grouping test also
keeps different Exam/version scopes separate.

## Browser smoke verification

Against the local Web/API development servers, after authenticating with the
owner-provided local test account:

1. The primary navigation showed Dashboard, Flashcards, Exams, Search, and
   Lookup; Review and Mistakes were absent from the primary list.
2. `/flashcards` showed the Flashcards sections navigation with Flashcards and
   Review. `/flashcards/review` kept Review active.
3. `/exams` and `/exams/mistakes` showed the Exams sections navigation with
   Exams and Mistakes.
4. Entering `猫` and pressing Enter navigated to `/lookup?q=猫`; the result,
   kanji enrichment, and source attribution rendered successfully.
5. A disposable local deck/card measured approximately 992 × 403 px in the
   1040 px study layout, confirming the shared flip card is larger than the
   former 340 px minimum. The disposable deck was soft-deleted after the smoke
   check.

## Deployment boundary

The local PostgreSQL database was brought up to the checked-in Phase 3 schema
with `prisma migrate deploy` before the persisted history/favorites smoke
check. Production is not claimed by this document: the server update procedure
must still run the checked-in migration chain and its health checks before the
new Lookup and mistake-retention schema is considered live.
