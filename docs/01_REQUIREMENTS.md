# 01 — Requirement Specification

## 1. Document status

- Product: Japanese Learning System
- Release: V1
- Audience: Product owner, developers, AI agents, testers, maintainers
- Purpose: Define complete V1 requirements and extension boundaries

---

## 2. Product objective

Build a private Japanese self-learning system that allows the user to create, import, organize, study, test, and retain learning content from both web and mobile clients while keeping all authoritative data on a backend server.

The product shall prioritize:

- Low friction content creation
- Reliable Markdown import/export
- Clear exam behavior
- Simple administration
- Good Japanese text support
- Strong data integrity
- Future extensibility without V1 feature bloat

---

## 3. V1 scope

### 3.1 Included

- Simple login
- Flashcard set management
- Flashcard management
- Flashcard study mode
- Flashcard Markdown import/export
- Exam folder management
- Exam management
- Single-correct multiple-choice questions
- 2–6 options per question
- Timed and untimed exams
- Exam attempt execution
- Automatic submission on timeout
- Server-side scoring
- Exam result review
- Highest-score retention
- Exam Markdown import/export
- Search and sorting
- Basic dashboard
- Soft deletion
- Responsive web UI
- Android/iOS-ready mobile app through Expo
- REST backend
- PostgreSQL persistence
- Validation, logging, tests, backup, deployment documentation

### 3.2 Explicitly out of scope for V1

- Public registration
- Password reset by email
- Social login
- Roles and complex permissions
- Full offline synchronization
- Spaced repetition / FSRS
- Daily streaks
- Social features
- Sharing between users
- Marketplace
- AI generation inside the product
- OCR
- Speech recognition
- Reading passage UI
- Listening exam UI
- Multiple-correct-answer questions
- Fill-in-the-blank scoring
- Writing/speaking grading
- Complex analytics
- Push notification system

These may be added later without changing the core V1 data ownership model.

---

## 4. Actors

### ACT-001 — Authenticated learner

The primary user can:

- Log in
- Manage learning content
- Study flashcards
- Take exams
- Import/export Markdown
- View best exam results

### ACT-002 — System administrator

In V1 the same human may act as administrator. Administration includes server configuration, backup, deployment, and credentials.

---

## 5. Authentication requirements

### AUTH-001

The system shall provide a login screen on web and mobile.

### AUTH-002

V1 shall not provide public registration.

### AUTH-003

V1 credentials shall be configured server-side through environment variables.

### AUTH-004

Passwords shall not be stored as plaintext where avoidable. The server configuration should store a strong password hash.

### AUTH-005

Successful login shall issue an authenticated session/token suitable for API access.

### AUTH-006

Protected API endpoints shall reject unauthenticated requests.

### AUTH-007

The frontend/mobile application shall never embed server secrets.

### AUTH-008

Logout shall remove the client authentication state.

### AUTH-009

Authentication failures shall use generic messages and shall not disclose secrets.

---

## 6. Flashcard set requirements

### FLASH-SET-001

The user shall be able to create a flashcard set.

### FLASH-SET-002

A flashcard set shall have:

- ID
- Title
- Optional description
- Optional icon/cover reference
- Created timestamp
- Updated timestamp
- Optional deleted timestamp

### FLASH-SET-003

The user shall be able to edit title and description.

### FLASH-SET-004

The user shall be able to soft-delete a set.

### FLASH-SET-005

Deleting a set shall soft-delete or hide its cards consistently.

### FLASH-SET-006

The user shall be able to restore a soft-deleted set if trash UI is enabled.

### FLASH-SET-007

The user shall be able to duplicate a set.

### FLASH-SET-008

Sets shall support manual or deterministic card ordering.

---

## 7. Flashcard requirements

### FLASH-001

A flashcard shall belong to exactly one flashcard set.

### FLASH-002

A flashcard shall contain:

- ID
- Set ID
- Front content
- Back content
- Position
- Created timestamp
- Updated timestamp
- Optional deleted timestamp

### FLASH-003

Front and back content shall be stored as text and rendered as safe Markdown.

### FLASH-004

The system shall allow arbitrary valid text in front/back fields, including Japanese Unicode.

### FLASH-005

The user shall be able to create, edit, delete, duplicate, and reorder cards.

### FLASH-006

The system shall not model flashcards as many-to-many with sets in V1.

### FLASH-007

Card content shall be sanitized before rendering unsafe embedded HTML.

---

## 8. Flashcard study requirements

### STUDY-001

The user shall be able to open a set in study mode.

### STUDY-002

The initial card view shall show one side at a time.

### STUDY-003

The user shall be able to flip front/back.

### STUDY-004

The user shall be able to move to previous/next card.

### STUDY-005

The UI shall show progress such as `15 / 80`.

### STUDY-006

The user shall be able to shuffle cards for a study session.

### STUDY-007

Desktop web shall support convenient keyboard shortcuts where practical, including space to flip and arrow keys to navigate.

### STUDY-008

V1 shall not persist spaced-repetition scheduling.

---

## 9. Flashcard Markdown import requirements

### FC-IMPORT-001

The user shall be able to upload a `.md` file and convert it into one flashcard set.

### FC-IMPORT-002

The format shall follow the project Markdown specification.

### FC-IMPORT-003

The server shall parse and validate the entire file before persistence.

### FC-IMPORT-004

The system shall show an import preview before writing data.

### FC-IMPORT-005

Preview shall report:

- Parsed title
- Card count
- Warnings
- Errors
- Invalid card locations

### FC-IMPORT-006

Confirmation shall create the set and all valid cards in one database transaction.

### FC-IMPORT-007

If persistence fails, no partial set shall remain.

### FC-IMPORT-008

The import UI shall provide an embedded format guide.

### FC-IMPORT-009

The guide shall include a copyable example/template.

### FC-IMPORT-010

Duplicate set names shall not silently merge content.

### FC-IMPORT-011

Default duplicate behavior shall be “create new” unless the user explicitly chooses another supported behavior.

### FC-IMPORT-012

Malformed or unsafe Markdown shall be rejected or sanitized.

---

## 10. Flashcard export requirements

### FC-EXPORT-001

A flashcard set shall be exportable to the supported Markdown format.

### FC-EXPORT-002

Exported content shall be importable again without losing supported data.

### FC-EXPORT-003

Export order shall match card order.

---

## 11. Exam folder requirements

### FOLDER-001

Exam content shall support folders.

### FOLDER-002

A folder may directly contain exams.

### FOLDER-003

A folder may contain child folders.

### FOLDER-004

Maximum folder nesting depth shall be 2 folder levels.

### FOLDER-005

Folder hierarchy shall be implemented using a single self-referencing folder model.

### FOLDER-006

The backend shall reject attempts to create depth greater than 2.

### FOLDER-007

Folders shall support create, rename, reorder, move within allowed depth, and soft delete.

### FOLDER-008

Moving a folder shall validate resulting subtree depth.

---

## 12. Exam requirements

### EXAM-001

An exam shall belong to zero or one exam folder.

### EXAM-002

An exam shall have:

- ID
- Folder ID nullable
- Title
- Optional description
- Optional logo/cover reference
- Optional time limit
- Version
- Question shuffle setting
- Option shuffle setting
- Created/updated/deleted timestamps

### EXAM-003

Time limit `null` shall represent an untimed exam.

### EXAM-004

A positive time limit shall be represented in a single canonical server unit.

### EXAM-005

The user shall be able to create, edit, duplicate, move, and soft-delete exams.

### EXAM-006

Metadata-only edits shall not invalidate prior best results.

### EXAM-007

Content-affecting edits shall increment exam content version and invalidate previous best result applicability.

Content-affecting edits include:

- Add/delete question
- Edit question text in a materially changed question
- Add/delete option
- Change option text in a way that changes assessment content
- Change correct option

---

## 13. Question requirements

### QUESTION-001

Every question shall have a type.

### QUESTION-002

V1 shall implement only `MULTIPLE_CHOICE_SINGLE`.

### QUESTION-003

The type model shall allow future types such as reading and listening.

### QUESTION-004

A V1 question shall have exactly one correct option.

### QUESTION-005

A V1 question shall have at least 2 options and at most 6 options.

### QUESTION-006

Question content and option content shall support safe Markdown text.

### QUESTION-007

Questions shall have deterministic positions.

### QUESTION-008

Options shall have deterministic positions.

### QUESTION-009

The backend shall enforce correctness cardinality and option count.

---

## 14. Future question context requirements

### CONTEXT-001

The data architecture shall reserve a concept for shared question context.

### CONTEXT-002

A future text context may represent a reading passage shared by multiple questions.

### CONTEXT-003

A future audio context may represent listening audio shared by multiple questions.

### CONTEXT-004

V1 UI is not required to manage these context types.

---

## 15. Exam Markdown import requirements

### EX-IMPORT-001

The user shall be able to upload a `.md` file to create one exam.

### EX-IMPORT-002

The answer key shall appear at the end of the Markdown document according to the project specification.

### EX-IMPORT-003

The parser shall not require correct answers to be embedded beside each visible option.

### EX-IMPORT-004

Before import, the system shall validate:

- Exam metadata
- Question numbering
- Question count
- Option count 2–6
- Unique option labels within a question
- Presence of answer key entries
- Exactly one valid key per question
- Key references an existing option

### EX-IMPORT-005

The system shall show preview and validation output before persistence.

### EX-IMPORT-006

The preview shall not unnecessarily reveal the answer key in the primary question preview.

### EX-IMPORT-007

Confirmed import shall be transactional.

### EX-IMPORT-008

Import errors shall identify the exact question/section where possible.

### EX-IMPORT-009

The UI shall provide format guidance and an example template.

### EX-IMPORT-010

Duplicate exam names shall not silently merge or overwrite.

---

## 16. Exam export requirements

### EX-EXPORT-001

An exam shall be exportable into the supported Markdown format.

### EX-EXPORT-002

The answer key shall be emitted at the end.

### EX-EXPORT-003

Supported V1 exam data shall survive export/import round trip.

---

## 17. Exam attempt requirements

### ATTEMPT-001

Starting an exam shall create a server-recognized attempt/session.

### ATTEMPT-002

The backend shall record the exam content version for the attempt.

### ATTEMPT-003

The backend shall record start time.

### ATTEMPT-004

For timed exams, the backend shall determine expiration time.

### ATTEMPT-005

Refreshing or reopening the client shall not reset the timer.

### ATTEMPT-006

The client shall never receive correct-answer flags before submission.

### ATTEMPT-007

The user may navigate between questions before submission.

### ATTEMPT-008

The UI shall indicate answered/unanswered/current question states.

### ATTEMPT-009

The UI shall show a submission confirmation including unanswered count.

### ATTEMPT-010

Expired timed attempts shall be automatically submitted or treated as submitted according to server time.

### ATTEMPT-011

A submitted attempt shall not accept answer modification.

### ATTEMPT-012

Server-side scoring shall be authoritative.

---

## 18. Scoring requirements

### SCORE-001

All V1 questions shall have equal weight.

### SCORE-002

Score shall be calculated as:

`correct_count / total_question_count * 100`

### SCORE-003

The displayed score shall use a documented rounding policy.

V1 policy: round to a maximum of two decimal places and omit unnecessary trailing zeros.

### SCORE-004

Result shall contain:

- Score / 100
- Correct count
- Total count
- Completion duration when available

### SCORE-005

For correct answers, the selected correct option shall be highlighted green.

### SCORE-006

For incorrect answers, the selected incorrect option shall be highlighted red and the correct option green.

### SCORE-007

For unanswered questions, the correct option shall be shown green after submission.

---

## 19. Best result requirements

### RESULT-001

The system shall retain the highest applicable result for each exam/version and user identity.

### RESULT-002

A lower later score shall not overwrite a higher best score.

### RESULT-003

The system may retain attempt count and timestamps without retaining complete lower-score answer history.

### RESULT-004

The exam list/detail shall display the best score when available.

### RESULT-005

A content-version change shall cause older best score to be treated as not applicable to the new version.

### RESULT-006

Tie policy: if the same best score is achieved again, the system may keep the earliest achievement timestamp while updating last-attempt metadata.

---

## 20. Search requirements

### SEARCH-001

The system shall support search over flashcard set titles.

### SEARCH-002

The system shall support search over flashcard front/back content.

### SEARCH-003

The system shall support search over exam titles.

### SEARCH-004

The system shall support search over folder names.

### SEARCH-005

Search shall correctly handle Japanese Unicode text.

### SEARCH-006

Search results shall be paginated or bounded.

---

## 21. Sorting requirements

### SORT-001

Flashcard sets shall support useful sorting such as name, created time, updated time.

### SORT-002

Exams shall support useful sorting such as name, created time, best score.

### SORT-003

Folder content shall support stable manual ordering.

---

## 22. Dashboard requirements

### DASH-001

The authenticated home screen shall show quick access to Flashcards and Exams.

### DASH-002

The dashboard should show recently accessed content if data is available.

### DASH-003

The dashboard may show best scores for recent exams.

### DASH-004

V1 dashboard shall remain simple and shall not require heavy analytics.

---

## 23. Soft-delete and data safety requirements

### DATA-001

User-created sets, cards, folders, and exams shall use soft deletion where practical.

### DATA-002

Permanent deletion shall not be the default destructive action.

### DATA-003

Cascade behavior shall be explicit and tested.

### DATA-004

Production data shall be backed up.

### DATA-005

Database restore procedure shall be documented and testable.

---

## 24. File and media requirements

### MEDIA-001

V1 content primarily uses text/Markdown.

### MEDIA-002

The architecture shall allow future media references without embedding large binaries directly in PostgreSQL unless explicitly justified.

### MEDIA-003

If icons/covers are implemented in V1, uploads shall use an approved size/type whitelist.

### MEDIA-004

Future audio support shall use server/object storage references.

---

## 25. Validation requirements

### VAL-001

All write APIs shall validate inputs server-side.

### VAL-002

Frontend validation is for UX only and shall not replace backend validation.

### VAL-003

IDs, enum values, lengths, time limits, folder depth, option count, and correctness constraints shall be validated.

### VAL-004

Validation errors shall be structured and actionable.

---

## 26. Error handling requirements

### ERR-001

The API shall use a consistent error envelope.

### ERR-002

Expected user errors shall not return raw stack traces.

### ERR-003

Unexpected server errors shall be logged with correlation/request identifiers where practical.

### ERR-004

The client shall provide retry actions for recoverable network errors.

### ERR-005

Import failures shall not leave partial data.

---

## 27. Performance requirements

### PERF-001

Normal list/detail API responses should feel interactive under typical personal-use server conditions.

### PERF-002

List endpoints shall avoid unbounded payloads.

### PERF-003

Database indexes shall exist for common foreign keys, ordering, lookup, and search paths.

### PERF-004

Import parsers shall enforce file size and item count limits to protect server resources.

### PERF-005

The design shall avoid N+1 query patterns in core list/detail flows.

---

## 28. Reliability requirements

### REL-001

Critical writes shall use database transactions.

### REL-002

Exam scoring shall be deterministic.

### REL-003

Timer decisions shall use server time as authority.

### REL-004

Database migrations shall be version controlled.

### REL-005

Application startup shall fail clearly when required configuration is missing.

---

## 29. Compatibility requirements

### COMPAT-001

Web shall support current stable Chromium-based browsers and a reasonable current Firefox/Safari baseline.

### COMPAT-002

Web UI shall be responsive for desktop and mobile widths.

### COMPAT-003

Mobile app shall target Android and iOS through Expo-compatible React Native.

### COMPAT-004

All systems shall use UTF-8.

---

## 30. Accessibility and usability requirements

### UX-001

Interactive controls shall have visible focus states on web.

### UX-002

Color shall not be the only indicator of exam correctness/state where practical.

### UX-003

Form errors shall be associated with the relevant field.

### UX-004

Destructive actions shall require explicit confirmation where data loss is meaningful.

### UX-005

Japanese text shall use fonts with appropriate glyph coverage.

---

## 31. Security requirements summary

Detailed controls are defined in `07_SECURITY.md`.

Minimum V1 requirements:

- Password hashing
- Secret isolation
- Authenticated protected routes
- Request validation
- Rate limiting on sensitive endpoints
- Safe Markdown rendering
- Safe upload handling
- CORS configuration
- HTTPS in production
- No answer leakage before exam submission
- No raw secrets in logs

---

## 32. Observability requirements

### OBS-001

Backend shall use structured logs.

### OBS-002

Logs shall cover login failures/success where appropriate, import failures, exam submission failures, unexpected exceptions, and startup/config failures.

### OBS-003

Secrets and passwords shall never be logged.

### OBS-004

A health endpoint shall exist for deployment checks.

---

## 33. Backup requirements

### BACKUP-001

Production PostgreSQL shall be backed up on a documented schedule.

### BACKUP-002

At least one restore procedure shall be documented and verified before production sign-off.

### BACKUP-003

Backups shall be stored separately from the live database volume when feasible.

---

## 34. Future extension boundaries

V1 architecture shall not block:

- Multiple users
- User-specific progress
- FSRS/spaced repetition
- Tags
- Favorites
- Reading question groups
- Listening question groups
- Audio/media
- AI-assisted content creation
- Offline-first mobile sync
- Analytics

However, none of these are required for V1 completion.

---

## 35. Global acceptance criteria

V1 is accepted when all of the following are true:

1. Login works on web and mobile.
2. Flashcard sets/cards can be created, edited, studied, searched, imported, and exported.
3. Exam folders enforce maximum depth 2.
4. Exams can be created manually and from Markdown.
5. Questions enforce 2–6 options and exactly one correct answer.
6. Timed exams survive refresh without timer reset.
7. Correct answers are not exposed before submission.
8. Scoring and answer highlighting are correct.
9. Best-score logic never overwrites a higher score with a lower score.
10. Exam content version changes invalidate old best-score applicability.
11. Import writes are transactional.
12. Soft-delete behavior is consistent.
13. Mandatory automated tests pass.
14. Fresh database migration works.
15. Production deployment and backup/restore procedures are documented.
