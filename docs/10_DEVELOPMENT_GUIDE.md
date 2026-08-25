# 10 — Development Guide

## 1. Engineering principles

- Correctness before speed
- Simple architecture before clever abstraction
- Server authority for business rules
- Test business-critical code
- Small, reviewable commits
- No silent requirement drift

---

## 2. TypeScript rules

- Strict TypeScript mode
- Avoid `any`; justify exceptions
- Use explicit domain enums
- Avoid unsafe type assertions
- Keep DTOs separate from persistence entities
- Shared contracts must not expose secrets/internal-only fields

---

## 3. Backend coding rules

- Controllers: transport only
- Services: use cases/business logic
- Prisma access: centralized enough to test and reason about
- Parser: pure or near-pure
- Scoring: pure function/service
- Use transactions for multi-record invariant changes
- Do not return Prisma records directly when that risks leaking internal fields

---

## 4. Frontend coding rules

- API access through a central client layer
- Handle loading/error/empty states
- Do not duplicate backend business validation as authority
- Use accessible controls
- Avoid large page components; extract domain UI components
- Never infer correct answers before server returns graded result

---

## 5. Mobile coding rules

- Reuse API contracts/utilities where safe
- Do not reuse web DOM-specific UI code
- Store auth material securely
- Treat network failures as normal mobile conditions
- Do not implement hidden offline synchronization in V1

---

## 6. Validation rules

Every write use case shall have:

- Transport/schema validation
- Domain validation
- Persistence constraint handling

Return actionable error codes.

---

## 7. Error handling

Expected domain errors should be typed/structured.

Unexpected errors:

- Log context
- Return safe generic message
- Add regression test when a bug is fixed

---

## 8. Logging

Use structured logging.

Log events, not arbitrary huge objects.

Never log secrets.

---

## 9. Commit rules

After each completed task in `task.md`:

- Run required checks
- Fix failures
- Update docs/tests
- Commit completed work

A task may contain multiple commits if the change is naturally separable.

Recommended message forms:

```text
feat(api): add flashcard set CRUD
fix(exams): prevent answer leakage in attempt payload
 test(import): cover invalid answer keys
 docs: document deployment backup flow
```

Do not commit broken intermediate code to the main integration branch unless using an explicitly disposable work branch.

---

## 10. Branch strategy

For a small project, simple trunk-based or short-lived feature branches are sufficient.

Avoid elaborate GitFlow unless needed.

---

## 11. Definition of Done for every task

A task is done only when:

1. Acceptance criteria are met.
2. Relevant tests exist and pass.
3. Lint/typecheck pass.
4. No known regression is introduced.
5. Documentation is updated if behavior/contracts changed.
6. Error cases are handled.
7. Code is committed.

---

## 12. Bug handling

When a task reveals a bug:

1. Stop progression on the dependent path.
2. Reproduce the bug.
3. Identify root cause.
4. Fix root cause, not just symptom.
5. Add regression test.
6. Run affected and global checks.
7. Confirm no data migration/contract damage.
8. Commit fix.
9. Only then continue to the next dependent task.

---

## 13. Documentation drift prevention

If implementation requires changing an approved requirement:

- Update `01_REQUIREMENTS.md` intentionally.
- Record the reason in `11_DECISIONS.md` when architectural/product-significant.
- Update API/DB/UI/security docs affected.
- Update `task.md` if scope changes.

Do not silently make the code the new source of truth.
