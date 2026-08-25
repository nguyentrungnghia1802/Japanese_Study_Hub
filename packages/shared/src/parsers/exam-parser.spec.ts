import { describe, it, expect } from 'vitest';
import { parseExamMarkdown, exportExamToMarkdown } from './exam-parser.js';

describe('Exam Markdown Parser (TASK-052 / EX-IMPORT-001..010)', () => {
  const canonicalExamMd = `# JLPT N3 Grammar Test 01

Time: 30
Shuffle Questions: true
Shuffle Options: false
Description: Official JLPT mock test

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
`;

  it('parses canonical valid exam markdown successfully', () => {
    const result = parseExamMarkdown(canonicalExamMd);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.title).toBe('JLPT N3 Grammar Test 01');
    expect(result.data?.timeLimitSeconds).toBe(1800);
    expect(result.data?.shuffleQuestions).toBe(true);
    expect(result.data?.shuffleOptions).toBe(false);
    expect(result.data?.description).toBe('Official JLPT mock test');
    expect(result.data?.questions).toHaveLength(2);

    const q1 = result.data?.questions[0];
    expect(q1?.content).toBe('日本へ＿＿前に、日本語を勉強しました。');
    expect(q1?.options).toHaveLength(4);
    expect(q1?.options[0].content).toBe('行く');
    expect(q1?.options[0].isCorrect).toBe(true);
    expect(q1?.options[1].isCorrect).toBe(false);

    const q2 = result.data?.questions[1];
    expect(q2?.options[1].content).toBe('に');
    expect(q2?.options[1].isCorrect).toBe(true);
  });

  it('fails when H1 title is missing', () => {
    const md = `## Question 1\nPrompt\n- A. Option 1\n- B. Option 2\n# ANSWER KEY\n1: A`;
    const result = parseExamMarkdown(md);

    expect(result.success).toBe(false);
    expect(result.issues.some((i) => i.code === 'EX_MISSING_TITLE')).toBe(true);
  });

  it('fails when ANSWER KEY section is missing', () => {
    const md = `# Title\n\n## Question 1\nPrompt\n- A. Opt 1\n- B. Opt 2`;
    const result = parseExamMarkdown(md);

    expect(result.success).toBe(false);
    expect(result.issues.some((i) => i.code === 'EX_MISSING_ANSWER_KEY')).toBe(true);
  });

  it('detects missing key entry for a question', () => {
    const md = `# Title\n\n## Question 1\nPrompt\n- A. Opt 1\n- B. Opt 2\n\n## Question 2\nPrompt 2\n- A. 1\n- B. 2\n\n# ANSWER KEY\n1: A`;
    const result = parseExamMarkdown(md);

    expect(result.success).toBe(false);
    expect(result.issues.some((i) => i.code === 'EX_MISSING_KEY_FOR_QUESTION')).toBe(true);
  });

  it('detects invalid option letter in answer key', () => {
    const md = `# Title\n\n## Question 1\nPrompt\n- A. Opt 1\n- B. Opt 2\n\n# ANSWER KEY\n1: Z`;
    const result = parseExamMarkdown(md);

    expect(result.success).toBe(false);
    expect(result.issues.some((i) => i.code === 'EX_INVALID_KEY_OPTION')).toBe(true);
  });

  it('detects question with invalid option count (< 2 or > 6)', () => {
    const md = `# Title\n\n## Question 1\nPrompt\n- A. Only one\n\n# ANSWER KEY\n1: A`;
    const result = parseExamMarkdown(md);

    expect(result.success).toBe(false);
    expect(result.issues.some((i) => i.code === 'EX_INVALID_OPTION_COUNT')).toBe(true);
  });

  it('ignores structural markdown keywords inside fenced code blocks', () => {
    const md = `# Code Test\n\n## Question 1\nConsider this code:\n\`\`\`markdown\n## Question 999\n- A. Fake\n# ANSWER KEY\n999: A\n\`\`\`\nWhat does it output?\n- A. Output A\n- B. Output B\n\n# ANSWER KEY\n1: A`;
    const result = parseExamMarkdown(md);

    expect(result.success).toBe(true);
    expect(result.data?.questions).toHaveLength(1);
    expect(result.data?.questions[0].options).toHaveLength(2);
  });

  it('guarantees round-trip fidelity (parse -> export -> parse)', () => {
    const parsed1 = parseExamMarkdown(canonicalExamMd);
    expect(parsed1.success).toBe(true);

    const exportedMd = exportExamToMarkdown(parsed1.data!);
    const parsed2 = parseExamMarkdown(exportedMd);

    expect(parsed2.success).toBe(true);
    expect(parsed2.data?.title).toBe(parsed1.data?.title);
    expect(parsed2.data?.timeLimitSeconds).toBe(parsed1.data?.timeLimitSeconds);
    expect(parsed2.data?.shuffleQuestions).toBe(parsed1.data?.shuffleQuestions);
    expect(parsed2.data?.shuffleOptions).toBe(parsed1.data?.shuffleOptions);
    expect(parsed2.data?.questions).toEqual(parsed1.data?.questions);
  });
});
