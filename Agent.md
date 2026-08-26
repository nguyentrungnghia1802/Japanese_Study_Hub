# Agent Rules — Japanese Learning System

## 1. Mission

You are the implementation agent for this project.

Your job is to build the complete Japanese Learning System according to the project documentation and `task.md`, from project setup through production-ready completion.

You must optimize for correctness, maintainability, security, traceability, and complete task execution.

---

## 2. Mandatory reading order

Before modifying code, read in this order:

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
13. `task.md`

Do not start implementation without understanding the relevant requirements.

---

## 3. Source-of-truth order

When there is a conflict:

1. Requirements
2. Approved decisions
3. Architecture
4. Database/API specifications
5. UI/Security/Testing/Deployment docs
6. Existing code

Do not silently override higher-priority documentation.

---

## 4. Task execution rule

Execute `task.md` in dependency order.

For every task:

1. Read the full task.
2. Identify referenced requirements.
3. Inspect existing relevant code.
4. Implement the smallest coherent solution.
5. Add/update tests.
6. Run task-specific checks.
7. Run affected integration checks.
8. Fix all failures caused or exposed by the task.
9. Update documentation when contracts/behavior changed.
10. Commit the completed task.
11. Mark checklist items complete only after verification.
12. Continue to the next task only when the current one satisfies Definition of Done.

---

## 5. Absolute bug rule

If a task fails, exposes a bug, creates a regression, or produces an inconsistent state:

**DO NOT move to the next dependent task.**

You must:

1. Reproduce the failure.
2. Determine the root cause.
3. Fix the root cause completely.
4. Add a regression test.
5. Re-run relevant tests.
6. Re-run lint/typecheck/build if affected.
7. Confirm no DB/API/data integrity issue remains.
8. Commit the fix.
9. Only then continue.

Do not hide errors with temporary bypasses, disabled tests, broad `try/catch`, `any`, `@ts-ignore`, or skipped validation unless the project documentation explicitly requires it.

---

## 6. No fake completion

Never mark a task complete because code was merely written.

A task is complete only when:

- Acceptance criteria are satisfied.
- Relevant tests pass.
- Lint passes.
- Typecheck passes.
- Build passes when applicable.
- No known regression remains.
- Documentation is consistent.
- Required commit exists.

---

## 7. Architecture rules

- Keep V1 as a modular monolith.
- Do not introduce microservices.
- Web/mobile never access PostgreSQL directly.
- Business rules live in backend/domain services.
- Server is source of truth.
- Use REST API.
- Use PostgreSQL + Prisma.
- Use explicit transactions for multi-record invariants.
- Do not leak persistence entities directly if that exposes internal fields.
- Keep parsers separate from persistence.
- Keep scoring pure/testable.

---

## 8. Exam security invariants

These rules are non-negotiable:

- Live attempt responses MUST NOT include `is_correct`, correct option IDs, answer-key metadata, or equivalent leakage.
- Correct answers are determined server-side only.
- Timer validity is determined by server time.
- Submitted attempts cannot be modified.
- Selected option must belong to the corresponding question.
- Question must belong to the attempt/exam snapshot.
- Duplicate submit must be idempotent.

Any violation is a critical bug and must be fixed before continuing.

---

## 9. Markdown import rules

- Upload → parse → validate → preview → confirm → transaction.
- Initial preview does not create domain records.
- Confirm must be safe against duplicate consumption.
- Import failure must not leave partial data.
- Errors should identify question/card/line when possible.
- Parser must not execute or fetch arbitrary content.
- Export must re-import semantically.

---

## 10. Database rules

- Do not edit applied migrations.
- Add new migration files.
- Test migrations from a clean DB.
- Preserve soft-delete semantics.
- Enforce folder maximum depth 2 in backend logic.
- Flashcard belongs to exactly one set.
- Exam questions have explicit type.
- V1 multiple-choice questions have 2–6 options and exactly one correct answer.
- Content-changing exam edit increments `content_version` atomically.

---

## 11. TypeScript rules

- Strict mode.
- Avoid `any`.
- Do not use `@ts-ignore` to bypass real errors.
- Prefer explicit DTOs/types.
- Validate untrusted input at boundaries.
- Never assume frontend types equal runtime validation.

---

## 12. Testing rules

Every feature/bug fix must include appropriate tests.

Critical domains require direct tests:

- Parser
- Folder depth
- Exam validation
- Scoring
- Timer
- Best-result logic
- Auth
- Answer leakage
- Transactions

Never delete a valid test simply to make the suite pass.

If a test is wrong because requirements changed, update the requirement/docs first, then update the test.

---

## 13. Security rules

- Never commit secrets.
- Never log passwords/tokens/secrets.
- Sanitize Markdown.
- Validate uploads.
- Rate limit sensitive endpoints.
- Restrict production CORS.
- Use HTTPS in production.
- No raw production stack traces to clients.

---

## 14. Scope discipline

V1 is the shipped regression baseline. The active `task.md` explicitly approves
Phase 2 work, including bounded caching, recent learning, favorites, tags, FSRS,
exam review, Android read caching, and the documented operations work. Implement
those approved Phase 2 requirements when their dependency order reaches them,
while preserving every V1 invariant and the same bug/security/commit rules.

Do not implement features outside the active approved task plan. Unapproved
additions remain out of scope: social features, complex analytics, microservices,
GraphQL, full offline sync, AI generation, and reading/listening UI.

---

## 15. Documentation discipline

If code behavior changes a documented contract:

1. Update the relevant source-of-truth document.
2. Update dependent docs.
3. Record important architectural/product changes in `docs/11_DECISIONS.md`.
4. Update `task.md` if scope/dependencies change.

Never allow code and docs to intentionally diverge.

---

## 16. Commit rules

- Commit after each completed task.
- Multiple commits inside one task are allowed when logically separated.
- Do not commit knowingly broken code to the main integration branch.
- Use descriptive conventional-style commit messages.

Examples:

- `feat(api): implement flashcard set CRUD`
- `feat(exams): add server-authoritative attempts`
- `fix(import): rollback failed exam imports`
- `test(exams): cover lower-score best-result behavior`

---

## 17. Dependency policy

Before adding a dependency:

- Check whether existing stack already solves the problem.
- Prefer maintained mainstream libraries.
- Avoid adding large packages for trivial utilities.
- Lock versions through package manager lockfile.
- Remove unused packages.

---

## 18. Refactoring policy

Refactor when needed for correctness/maintainability, but do not perform broad unrelated rewrites during a focused task.

Large refactors require:

- Preserved behavior tests
- Clear reason
- Separate commit when practical

---

## 19. Error handling policy

Do not swallow exceptions.

Expected errors:

- Return typed domain/API errors.

Unexpected errors:

- Log with safe context.
- Return generic safe response.
- Add regression coverage after fixing.

---

## 20. Final completion gate

Before declaring the project 100% complete:

- Every checkbox in `task.md` is checked.
- Full lint passes.
- Full typecheck passes.
- Unit tests pass.
- Integration tests pass.
- Critical E2E passes.
- Web builds.
- API builds.
- Mobile typecheck/build smoke succeeds.
- Fresh DB migration succeeds.
- No known critical/high bug remains.
- Security checklist passes.
- Backup/restore instructions are verified.
- Documentation matches implementation.
- Final release commit exists.
