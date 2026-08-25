# 05 — Markdown Import / Export Specification

## 1. Goals

The Markdown formats shall be:

- Human readable
- Easy to author manually
- Easy for AI to generate
- Strict enough to parse deterministically
- Round-trip compatible
- Safe to preview

All files use UTF-8.

---

# Part A — Flashcard Format

## 2. Flashcard file structure

Canonical V1 format:

```markdown
# JLPT N3 Vocabulary

Description: Optional description

## Card 1

### Front

改善

### Back

かいぜん

Cải thiện.

---

## Card 2

### Front

確認

### Back

かくにん

Xác nhận.
```

---

## 3. Flashcard parsing rules

### FC-MD-001

The first H1 heading is the flashcard set title.

### FC-MD-002

`Description:` is optional metadata before the first card.

### FC-MD-003

Each card begins with an H2 heading matching `Card <number>`.

### FC-MD-004

Each card must contain one `### Front` section.

### FC-MD-005

Each card must contain one `### Back` section.

### FC-MD-006

Front/back body may contain multiline Markdown until the next structural heading/card separator.

### FC-MD-007

Card numbers must be unique and should be sequential.

### FC-MD-008

Empty front or back is invalid.

### FC-MD-009

Horizontal rule separators are recommended but parser shall primarily rely on headings.

### FC-MD-010

Unknown top-level metadata shall produce a warning unless explicitly forbidden.

---

## 4. Flashcard escaping

Content may contain ordinary Markdown headings only if they do not collide with reserved structural headings.

If content needs literal reserved text such as `### Front`, author should escape it or place it in a fenced code block.

The parser shall ignore structural markers inside fenced code blocks.

---

## 5. Flashcard export

Export shall emit:

1. Set title
2. Optional description
3. Cards in position order
4. `### Front`
5. `### Back`

Exported output must re-import successfully.

---

# Part B — Exam Format

## 6. Canonical exam file

```markdown
# JLPT N3 Grammar Test 01

Time: 30
Shuffle Questions: false
Shuffle Options: false

## Question 1

日本へ＿＿前に、日本語を勉強しました。

- A. 行く
- B. 行った
- C. 行き
- D. 行って

## Question 2

私は毎朝7時＿＿起きます。

- A. を
- B. に
- C. で
- D. が

# ANSWER KEY

1: A
2: B
```

---

## 7. Exam metadata

Supported V1 metadata:

- `Time: <minutes>`
- `Shuffle Questions: true|false`
- `Shuffle Options: true|false`
- Optional `Description:` may be supported as a multiline or single-line field using a documented convention.

Rules:

- Missing Time means untimed.
- Time must be a positive integer number of minutes in Markdown input.
- Backend converts it to seconds.
- Invalid booleans are errors.

---

## 8. Question structure

### EX-MD-001

Each question starts with `## Question <number>`.

### EX-MD-002

Question numbers must be unique.

### EX-MD-003

Question body is Markdown text before the option list.

### EX-MD-004

Options use list items with labels `A.` through `F.`.

### EX-MD-005

Each question must contain 2–6 options.

### EX-MD-006

Option labels must be unique within the question.

### EX-MD-007

V1 supports exactly one correct answer in the answer key.

### EX-MD-008

The parser shall preserve question and option order.

---

## 9. Answer key

### EX-MD-KEY-001

The answer key section must appear after all questions.

### EX-MD-KEY-002

The heading must be exactly `# ANSWER KEY` in canonical exports.

### EX-MD-KEY-003

Each entry uses:

```text
<number>: <option label>
```

Example:

```text
1: A
2: D
3: B
```

### EX-MD-KEY-004

Every question must have exactly one key entry.

### EX-MD-KEY-005

The option label in the key must exist for that question.

### EX-MD-KEY-006

Duplicate key entries for a question are errors.

### EX-MD-KEY-007

Unknown question numbers in the answer key are errors.

---

## 10. Why answer key is at the end

The format intentionally keeps correct answers away from the visible top of the file so that opening the Markdown document does not immediately reveal the answer key.

The application preview should likewise focus on question structure and avoid placing the answer key prominently unless explicitly requested.

---

## 11. Parser validation errors

Error objects should include:

- Code
- Human-readable message
- Line number when available
- Question/card number when available
- Severity (`ERROR`, `WARNING`)

Example:

```json
{
  "code": "EXAM_ANSWER_OPTION_NOT_FOUND",
  "message": "Question 11 answer E does not exist.",
  "question": 11,
  "line": 88,
  "severity": "ERROR"
}
```

---

## 12. File constraints

Configuration shall define:

- Maximum file size
- Maximum cards per flashcard import
- Maximum questions per exam import
- Maximum content length per field

Suggested starting limits for V1 may be conservative and configurable rather than hard-coded.

---

## 13. Safety rules

- Reject non-`.md` upload extension unless another format is explicitly supported.
- Validate MIME loosely but do not rely on MIME alone.
- Read as UTF-8.
- Do not execute HTML/script.
- Sanitize rendered Markdown.
- Reject binary content.
- Do not resolve arbitrary local file includes.
- Do not fetch remote URLs during parsing.

---

## 14. Import preview requirements

Flashcard preview shows:

- Set title
- Description summary
- Card count
- Card snippets
- Errors/warnings

Exam preview shows:

- Title
- Time limit
- Shuffle settings
- Question count
- Option counts
- Errors/warnings

The confirm button shall be disabled while blocking errors remain.

---

## 15. Round-trip guarantees

For V1-supported fields:

```text
DB → Export Markdown → Import → DB
```

shall preserve semantic content and ordering.

Whitespace formatting need not be byte-identical.

---

## 16. Future format versioning

If the syntax changes incompatibly, add a format marker such as:

```text
Format-Version: 2
```

Do not silently reinterpret incompatible old files.
