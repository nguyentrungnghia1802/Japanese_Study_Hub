# Japanese Learning System — Project Documentation

## 1. Purpose

This repository contains the source-of-truth documentation for a personal Japanese self-learning platform consisting of:

- Web application
- Mobile application
- Backend API
- PostgreSQL database
- Markdown-based content import/export

The first release focuses on two learning domains:

1. Flashcards
2. Exams / quizzes

The system is intentionally simple in V1 while preserving clean extension points for reading, listening, media, spaced repetition, multiple users, and richer analytics later.

## 2. Documentation order

Read documents in this order before implementation:

1. `docs/01_REQUIREMENTS.md`
2. `docs/02_ARCHITECTURE.md`
3. `docs/03_DATABASE.md`
4. `docs/04_API.md`
5. `docs/05_MARKDOWN_SPEC.md`
6. `docs/06_UI_UX.md`
7. `docs/07_SECURITY.md`
8. `docs/08_TESTING.md`
9. `docs/09_DEPLOYMENT.md`
10. `docs/10_DEVELOPMENT_GUIDE.md`
11. `docs/11_DECISIONS.md`
12. `docs/12_TRACEABILITY.md`
13. `Agent.md`
14. `task.md`

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

## 5. V1 principles

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

## 6. Local development commands

The Web/API/Database remain Node, pnpm, Docker, and PostgreSQL services. The mobile
client is an independent Gradle project and does not require Node or pnpm to build.

```bash
pnpm install
pnpm dev

cd apps/mobile
./gradlew testDebugUnitTest lintDebug assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The Android debug build defaults to `http://localhost:4000/api/v1`. For an Android
emulator whose host machine is the local API, use:

```bash
./gradlew assembleDebug -PapiBaseUrl=http://10.0.2.2:4000/api/v1
```

Release builds default to `http://157.173.127.217:4000/api/v1`; a deployment can
override the centralized build-time value with the same `apiBaseUrl` Gradle property.
No signing key or release secret is stored in the repository.

## 7. Definition of project completion

The project is complete only when:

- Every mandatory requirement is implemented.
- All mandatory tests pass.
- No critical or high-severity known bug remains.
- Database migrations run from a clean database.
- Web and Android mobile clients work against the same backend.
- Markdown import/export round trips correctly for supported formats.
- Deployment documentation has been verified.
- `task.md` is fully checked.
