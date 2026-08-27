# Japanese Learning System — Project Documentation

## 1. Purpose

This repository contains the source-of-truth documentation for a personal Japanese self-learning platform consisting of:

- Web application
- Mobile application
- Backend API
- PostgreSQL database
- Markdown-based content import/export

The V1 release focused on two learning domains:

1. Flashcards
2. Exams / quizzes

The system remains intentionally simple while preserving clean extension points for
reading, listening, media, multiple users, and richer analytics. Phase 2 is the
approved follow-up release and adds bounded responsiveness, learning productivity,
server-authoritative FSRS review, exam remediation, and native Android read caching
without changing the V1 integrity boundary.

## 2. Documentation order

Read documents in this order before implementation:

1. `README.md`
2. `docs/01_REQUIREMENTS.md`
3. `docs/11_DECISIONS.md`
4. `docs/02_ARCHITECTURE.md`
5. `docs/03_DATABASE.md`
6. `docs/04_API.md`
7. `docs/05_MARKDOWN_SPEC.md`
8. `docs/06_UI_UX.md`
9. `docs/07_SECURITY.md`
10. `docs/08_TESTING.md`
11. `docs/09_DEPLOYMENT.md`
12. `docs/10_DEVELOPMENT_GUIDE.md`
13. `docs/12_TRACEABILITY.md`
14. `docs/13_PHASE2_REQUIREMENTS.md` when Phase 2 is active
15. `Agent.md`
16. `tasks/task.md`

## 3. Source-of-truth priority

When documents conflict, use this order:

1. `01_REQUIREMENTS.md`
2. `11_DECISIONS.md`
3. `02_ARCHITECTURE.md`
4. `03_DATABASE.md`
5. `04_API.md`
6. Remaining documents
7. Existing implementation

If an implementation conflicts with an approved requirement, fix the implementation unless the requirement is explicitly revised.

## 4. Target stack

- Monorepo: pnpm workspace + Turborepo
- Web: Next.js + React + TypeScript
- Mobile: Android Native Kotlin + Jetpack Compose + Material 3
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- ORM: Prisma
- API: REST + OpenAPI
- Containerization: Docker / Docker Compose
- Testing: unit + integration + E2E

## 5. Current Phase 2 baseline

Phase 2 keeps PostgreSQL and the API authoritative. The delivered scope includes:

- One bounded, memory-only TanStack Query cache for Web reads, with explicit
  invalidation and freshness-first live attempts.
- Minimal browser storage: bearer authentication remains the current Web strategy
  until an approved HTTPS/CSRF design enables a secure cookie migration.
- Bounded recent learning, favorites, normalized flat tags, responsive search, and
  independent multi-file Markdown preview/confirmation.
- Server-authoritative, UTC-based, idempotent FSRS review with the four approved
  ratings, plus isolated wrong-answer practice that cannot alter official results.
- A bounded Android Room read projection for summaries and resume data. Active
  attempts, answer keys, FSRS state, and pending mutations are never cached there.
- Guarded production update, backup/restore, transport-audit, and safe request
  observability procedures documented under `docs/`.

The complete Phase 2 requirements and its deferred boundary are in
`docs/13_PHASE2_REQUIREMENTS.md`.

## 6. V1 regression baseline

- Server is the source of truth.
- No full offline synchronization in V1.
- No registration flow.
- Credentials are server-managed and configured through environment variables.
- Correct exam answers are never exposed before submission.
- Markdown imports always validate and preview before commit.
- Import writes are transactional.
- Flashcards belong to exactly one flashcard set.
- Exam folders support at most two folder levels.
- Exam questions are designed around a `type` field even though V1 implements only single-correct multiple choice.
- Lower exam scores do not overwrite the highest score.
- Content-changing exam edits invalidate previous best scores through exam versioning.

## 7. Local development commands

The Web/API/Database remain Node, pnpm, Docker, and PostgreSQL services. The mobile
client is an independent Gradle project and does not require Node or pnpm to build.

```bash
pnpm install
pnpm dev

cd apps/mobile
./gradlew testDebugUnitTest lintDebug assembleDebug
adb install -r "app/build/outputs/apk/debug/Japanese Study Hub-debug.apk"
```

The Android debug build defaults to `http://localhost:4000/api/v1`. For an Android
emulator whose host machine is the local API, use:

```bash
./gradlew assembleDebug -PapiBaseUrl=http://10.0.2.2:4000/api/v1
```

For an installable APK that uses the production API, build the `production` variant:

```bash
./gradlew assembleProduction
adb install -r "app/build/outputs/apk/production/Japanese Study Hub.apk"
```

Production and release builds default to `http://157.173.127.217:4000/api/v1`; a
deployment can override the centralized build-time value with the same `apiBaseUrl`
Gradle property. The `production` variant uses the local debug keystore only for
owner/device validation; no signing key or release secret is stored in the repository.

## 8. Definition of project completion

V1 was completed and released before the current Phase 2 task plan. Phase 2 is
now the active development scope and must preserve the V1 behavior baseline. The
project may be declared Phase 2-complete only after every mandatory item through
TASK-321 is verified, documented, and committed.

The project is complete only when:

- Every mandatory requirement is implemented.
- All mandatory tests pass.
- No critical or high-severity known bug remains.
- Database migrations run from a clean database.
- Web and Android mobile clients work against the same backend.
- Markdown import/export round trips correctly for supported formats.
- Deployment documentation has been verified.
- `tasks/task-01.md` is fully checked and the active plan is `tasks/task.md`.
