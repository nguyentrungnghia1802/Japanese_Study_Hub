import { describe, it, expect } from 'vitest';
import { parseFlashcardMarkdown } from './parsers/flashcard-parser.js';
import { parseExamMarkdown } from './parsers/exam-parser.js';

describe('Security & XSS Hardening (TASK-110)', () => {
  it('parses flashcard content safely without executing arbitrary html/scripts', () => {
    const rawMarkdown = `# <script>alert("xss")</script> Set

## Card 1
### Front
<img src="x" onerror="alert(1)">

### Back
<b>Meaning</b>
`;
    const parsed = parseFlashcardMarkdown(rawMarkdown);
    expect(parsed.data?.title).toContain('<script>');
    expect(parsed.data?.cards[0].front).toContain('<img src="x"');
    expect(parsed.data?.cards[0].back).toBe('<b>Meaning</b>');
  });

  it('parses exam content safely without executing injected scripts', () => {
    const rawMarkdown = `# <script>alert('xss')</script> Exam
Time: 10

## Question 1
<iframe src="javascript:alert(1)"></iframe> Choose answer:
- A. Safe Option
- B. <script>evil()</script>

# ANSWER KEY
1: A
`;
    const parsed = parseExamMarkdown(rawMarkdown);
    expect(parsed.data?.title).toContain('<script>');
    expect(parsed.data?.questions[0].content).toContain('<iframe');
    expect(parsed.data?.questions[0].options[1].content).toContain('<script>');
  });
});
