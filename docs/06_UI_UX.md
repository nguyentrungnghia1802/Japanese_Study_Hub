# 06 — UI / UX and Page Structure

## 1. UX principles

- Fast to understand
- Low visual clutter
- Content first
- Mobile-friendly
- Japanese text readable
- Destructive actions safe
- Import errors actionable
- Exam state always obvious

---

## 2. Global navigation

Web recommended primary navigation:

- Dashboard
- Flashcards
- Exams
- Search
- Settings/Logout

Mobile recommended bottom/tab or stack navigation:

- Home
- Flashcards
- Exams
- Search

---

## 3. Login

Fields:

- Username
- Password
- Login button

States:

- Loading
- Invalid credentials
- Network error

Do not expose whether username or password specifically was wrong.

---

## 4. Dashboard

Sections:

- Continue/recent learning
- Recent flashcard sets
- Recent exams
- Best scores for recent exams
- Quick create/import actions

Keep V1 dashboard concise.

---

## 5. Flashcard set list

Each item/card may show:

- Title
- Description snippet
- Card count
- Last updated
- Primary “Study” action
- Overflow menu for edit/duplicate/delete/export

Controls:

- Search
- Sort
- Create set
- Import Markdown

Empty state should explain how to create/import the first set.

---

## 6. Flashcard set detail/editor

Header:

- Title
- Description
- Study
- Add card
- Import/export actions

Card list:

- Position
- Front preview
- Back preview
- Edit
- Duplicate
- Delete
- Reorder

Use virtualization or pagination if the card count becomes large.

---

## 7. Flashcard editor

Fields:

- Front Markdown textarea/editor
- Back Markdown textarea/editor

Optional live preview.

Actions:

- Save
- Cancel

Validation:

- Both sides required

---

## 8. Flashcard study screen

Core layout:

```text
Set title                      15 / 80

┌───────────────────────────────┐
│                               │
│           FRONT               │
│                               │
└───────────────────────────────┘

Previous        Flip          Next
```

Actions:

- Flip
- Previous
- Next
- Shuffle/restart
- Exit

Keyboard web:

- Space = flip
- Left/right arrows = navigate

---

### Review due mode

The Dashboard and primary navigation expose a `Review due` entry point. The
review screen shows server-provided Due/New counts, loads at most 20 cards into
the active session, and keeps Study All / Shuffle available through the
Flashcards page.

Review interaction:

1. Show the front/prompt only.
2. Flip the shared flashcard interaction to reveal the meaning.
3. Enable Again, Hard, Good, and Easy only after reveal.
4. Submit the rating to the server and advance in place without a route reload.

The screen shows reviewed/remaining progress, a recoverable Retry state, and an
explicit completion state. Only a small next-card prefetch is allowed; the
active review array and React Query cache remain bounded and memory-only.

Android review mode:

- The `Ôn tập` navigation destination opens the same server-authoritative flow.
- Compose shows Due/New counts, reviewed/remaining progress, and an explicit
  completion state.
- Again, Hard, Good, and Easy remain disabled until the meaning is revealed.
- A failed rating keeps the revealed card and its client request id so retrying
  cannot submit a second transition. The active ViewModel queue is capped at 20.
  Phase 2 remains online-first and does not add offline FSRS synchronization;
  Android Room is limited to the separate bounded read projection documented in
  the architecture and cache policy.

---

## 9. Flashcard import UI

Steps:

1. Upload
2. Validate
3. Preview
4. Confirm
5. Success

Components:

- Drag/drop or file picker
- Format guide button
- Template/example
- Parsed summary
- Error list
- Warning list
- Duplicate policy

Never create domain data before confirmation.

The Markdown picker may select up to 20 files. Batch preview displays each file
status independently and processes previews one at a time. Every successful file
still requires its own Confirm action; a failed file remains visible with its
error and cannot silently consume an import token. Single-file paste/upload
continues to use the existing preview screen.

---

## 10. Exam library/folder page

Layout options:

- Left folder tree on desktop
- Hierarchical list/navigation on mobile

Folder row:

- Name
- Child count
- Overflow actions

Exam row/card:

- Logo/cover if present
- Title
- Time limit
- Question count
- Best score immediately visible when available
- Start button
- Edit menu

---

## 11. Exam editor

Sections:

- Metadata
- Questions
- Settings

Metadata:

- Title
- Description
- Folder
- Time limit
- Cover/icon

Settings:

- Shuffle questions toggle
- Shuffle options toggle

Question editor:

- Question Markdown
- 2–6 options
- One radio selector for correct answer
- Reorder options
- Reorder questions

The editor shall prevent saving an invalid question.

---

## 12. Exam import UI

Same staged flow as flashcards.

## 13. Learning tags

Flashcard-set and exam library cards may display a small bounded set of flat
tag chips. Library filters offer one tag at a time alongside folders/search and
favorites. Detail views provide an add/remove editor with a 20-tag limit; save
replaces the assignment and reports normalization/server errors inline. Tags
are optional and never hide the primary Study/Take actions.

Preview summary:

```text
Title: JLPT N3 Grammar Test 01
Time: 30 minutes
Questions: 40
Options: 160
Errors: 0
Warnings: 0
```

Error example:

```text
Question 11 — Answer E does not exist.
```

Do not place the full answer key at the top of preview.

---

## 13. Exam start screen

Before starting:

- Exam title
- Description
- Question count
- Time limit or “No time limit”
- Best score
- Shuffle indicators if useful
- Start button

Starting creates a server attempt.

## 13.1 Review mistakes and Practice

The Exams area exposes a `Review mistakes` destination. It displays no more than
20 incorrect/unanswered prompts from submitted attempts, shows the selected
answer when present, and offers per-item dismiss, clear-all, and `Practice`
actions. The pre-submit view never shows correctness or the answer key.

Practice is visibly labeled `PRACTICE MODE`, has no countdown, and contains only
the selected weak questions. After submission it may show grading feedback, but
the result explicitly states that the official exam best score is unchanged.
The same bounded flow is available on Android.

---

## 14. Exam taking screen

Recommended desktop structure:

```text
Question 14 / 50                  37:42

Question content

○ A. ...
○ B. ...
○ C. ...
○ D. ...

Previous                         Next

Question navigator
1 2 3 4 5 6 ... 50
```

States:

- Current
- Answered
- Unanswered

The color/state should also use non-color cues where practical.

---

## 15. Timer behavior

- Visible for timed exams
- Derived from server expiration
- Does not reset on refresh
- Warn near expiration without obstructing work
- Auto-submits when server considers attempt expired

---

## 16. Submission confirmation

Show:

- Total questions
- Answered count
- Unanswered count
- Remaining time

Buttons:

- Continue exam
- Submit

---

## 17. Result screen

Header:

- Exam title
- Score /100
- Correct/total
- Duration
- Best score

Question review:

Correct selected answer:

- green row + correct icon/text

Wrong selected answer:

- selected wrong row red
- correct row green

Unanswered:

- explicit “Not answered” label
- correct row green

---

## 18. Search page

Single search field can show grouped results:

- Flashcard sets
- Flashcards
- Exams
- Folders

Each result links directly to the relevant content.

---

## 19. Loading/empty/error states

Every data page shall define:

- Loading state/skeleton
- Empty state
- Recoverable error with Retry
- Unauthorized redirect
- Not found state

Avoid blank screens.

---

## 20. Responsive rules

- Desktop may use sidebars/tables.
- Mobile uses stacked cards/lists.
- Exam option tap targets must be large enough.
- Long Japanese lines must wrap correctly.
- Fixed footer controls must not hide answer content.

---

## 21. Accessibility basics

- Semantic buttons/inputs
- Keyboard access on web
- Visible focus
- Form labels
- Error text near fields
- Do not rely solely on red/green color
- Sufficient contrast

---

## 22. Design non-goals

V1 does not require:

- Heavy animation
- Gamification
- Complex themes
- Social profile screens
- Advanced charts
- Custom rich-text editor framework
