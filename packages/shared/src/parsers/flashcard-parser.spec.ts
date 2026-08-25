import { describe, it, expect } from 'vitest';
import { parseFlashcardMarkdown, exportFlashcardSetToMarkdown } from './flashcard-parser.js';

describe('Flashcard Markdown Parser (TASK-032 / FC-IMPORT-001..012)', () => {
  const validMarkdown = `# JLPT N3 Vocabulary

Description: Essential vocabulary for JLPT N3 level

## Card 1

### Front

改善

### Back

かいぜん
Cải thiện, tiến bộ.

---

## Card 2

### Front

確認

### Back

かくにん
Xác nhận, kiểm tra.
`;

  it('parses canonical valid flashcard markdown successfully', () => {
    const result = parseFlashcardMarkdown(validMarkdown);

    expect(result.success).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'ERROR')).toHaveLength(0);
    expect(result.data).toBeDefined();
    expect(result.data?.title).toBe('JLPT N3 Vocabulary');
    expect(result.data?.description).toBe('Essential vocabulary for JLPT N3 level');
    expect(result.data?.cards).toHaveLength(2);
    expect(result.data?.cards[0].front).toBe('改善');
    expect(result.data?.cards[0].back).toContain('かいぜん');
    expect(result.data?.cards[1].front).toBe('確認');
  });

  it('fails with FC_MISSING_TITLE when H1 title is absent', () => {
    const invalidMd = `## Card 1\n### Front\n犬\n### Back\nDog`;
    const result = parseFlashcardMarkdown(invalidMd);

    expect(result.success).toBe(false);
    expect(result.issues.some((i) => i.code === 'FC_MISSING_TITLE')).toBe(true);
  });

  it('detects empty front or empty back with line numbers', () => {
    const invalidMd = `# Japanese Basics\n\n## Card 1\n\n### Front\n\n\n### Back\n\nCat`;
    const result = parseFlashcardMarkdown(invalidMd);

    expect(result.success).toBe(false);
    expect(result.issues.some((i) => i.code === 'FC_EMPTY_FRONT')).toBe(true);
  });

  it('detects duplicate card numbers', () => {
    const invalidMd = `# Set\n\n## Card 1\n### Front\nA\n### Back\nB\n\n## Card 1\n### Front\nC\n### Back\nD`;
    const result = parseFlashcardMarkdown(invalidMd);

    expect(result.issues.some((i) => i.code === 'FC_DUPLICATE_CARD_NUMBER')).toBe(true);
  });

  it('ignores structural keywords inside fenced code blocks', () => {
    const mdWithCode = `# Markdown Tutorial\n\n## Card 1\n\n### Front\n\nHow to write a heading?\n\n### Back\n\nUse:\n\`\`\`markdown\n### Front\n\`\`\`\n`;
    const result = parseFlashcardMarkdown(mdWithCode);

    expect(result.success).toBe(true);
    expect(result.data?.cards).toHaveLength(1);
    expect(result.data?.cards[0].back).toContain('```markdown\n### Front\n```');
  });

  it('guarantees round-trip compatibility (parse -> export -> parse)', () => {
    const parsed1 = parseFlashcardMarkdown(validMarkdown);
    expect(parsed1.success).toBe(true);
    expect(parsed1.data).toBeDefined();

    const exported = exportFlashcardSetToMarkdown(parsed1.data!);
    const parsed2 = parseFlashcardMarkdown(exported);

    expect(parsed2.success).toBe(true);
    expect(parsed2.data?.title).toBe(parsed1.data?.title);
    expect(parsed2.data?.description).toBe(parsed1.data?.description);
    expect(parsed2.data?.cards).toEqual(parsed1.data?.cards);
  });
});
