import { ImportErrorDetailDto } from '@japanese-learning/contracts';

export interface ParsedFlashcardSet {
  title: string;
  description?: string;
  cards: Array<{ front: string; back: string; position: number }>;
}

export interface FlashcardParseResult {
  success: boolean;
  data: ParsedFlashcardSet | null;
  issues: ImportErrorDetailDto[];
}

/**
 * Parses flashcard Markdown text following 05_MARKDOWN_SPEC.md
 */
export function parseFlashcardMarkdown(rawContent: string): FlashcardParseResult {
  const issues: ImportErrorDetailDto[] = [];
  const lines = rawContent.split(/\r?\n/);

  let title: string | null = null;
  let description: string | null = null;
  const cards: Array<{ front: string; back: string; position: number }> = [];

  let inCodeBlock = false;
  let currentCardNumber: number | null = null;
  let currentSection: 'FRONT' | 'BACK' | null = null;
  let frontLines: string[] = [];
  let backLines: string[] = [];
  const seenCardNumbers = new Set<number>();

  const flushCard = (lineNumber: number) => {
    if (currentCardNumber !== null) {
      const front = frontLines.join('\n').trim();
      const back = backLines.join('\n').trim();

      if (!front) {
        issues.push({
          code: 'FC_EMPTY_FRONT',
          message: `Card ${currentCardNumber} has empty front content.`,
          line: lineNumber,
          card: currentCardNumber,
          severity: 'ERROR',
        });
      }

      if (!back) {
        issues.push({
          code: 'FC_EMPTY_BACK',
          message: `Card ${currentCardNumber} has empty back content.`,
          line: lineNumber,
          card: currentCardNumber,
          severity: 'ERROR',
        });
      }

      if (front && back) {
        cards.push({
          front,
          back,
          position: cards.length,
        });
      }
    }

    frontLines = [];
    backLines = [];
    currentSection = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    const trimmed = line.trim();

    // Toggle fenced code block
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (currentSection === 'FRONT') frontLines.push(line);
      if (currentSection === 'BACK') backLines.push(line);
      continue;
    }

    if (inCodeBlock) {
      if (currentSection === 'FRONT') frontLines.push(line);
      if (currentSection === 'BACK') backLines.push(line);
      continue;
    }

    // Top-level H1 (Title)
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      if (currentCardNumber === null && !title) {
        title = trimmed.slice(2).trim();
        continue;
      }
    }

    // Top-level Description before first card
    if (currentCardNumber === null && trimmed.toLowerCase().startsWith('description:')) {
      description = trimmed.slice(12).trim();
      continue;
    }

    // Horizontal rule separator between cards (FC-MD-009)
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      if (currentSection === 'BACK') {
        flushCard(lineNumber);
        currentCardNumber = null;
        continue;
      }
    }

    // Card Header: ## Card <number>
    const cardHeaderMatch = trimmed.match(/^##\s+Card\s+(\d+)/i);
    if (cardHeaderMatch) {
      flushCard(lineNumber);
      const cardNum = parseInt(cardHeaderMatch[1], 10);
      if (seenCardNumbers.has(cardNum)) {
        issues.push({
          code: 'FC_DUPLICATE_CARD_NUMBER',
          message: `Duplicate card number: ${cardNum}`,
          line: lineNumber,
          card: cardNum,
          severity: 'ERROR',
        });
      }
      seenCardNumbers.add(cardNum);
      currentCardNumber = cardNum;
      continue;
    }

    // Front section header: ### Front
    if (trimmed.match(/^###\s+Front/i)) {
      if (currentCardNumber === null) {
        issues.push({
          code: 'FC_ORPHAN_FRONT',
          message: 'Found ### Front outside of a ## Card block.',
          line: lineNumber,
          severity: 'ERROR',
        });
      }
      currentSection = 'FRONT';
      continue;
    }

    // Back section header: ### Back
    if (trimmed.match(/^###\s+Back/i)) {
      if (currentCardNumber === null) {
        issues.push({
          code: 'FC_ORPHAN_BACK',
          message: 'Found ### Back outside of a ## Card block.',
          line: lineNumber,
          severity: 'ERROR',
        });
      }
      currentSection = 'BACK';
      continue;
    }

    // Card content accumulation
    if (currentSection === 'FRONT') {
      frontLines.push(line);
    } else if (currentSection === 'BACK') {
      backLines.push(line);
    }
  }

  // Flush final card
  flushCard(lines.length);

  if (!title) {
    issues.push({
      code: 'FC_MISSING_TITLE',
      message: 'Flashcard markdown must begin with an H1 (# <Title>) heading.',
      line: 1,
      severity: 'ERROR',
    });
  }

  if (cards.length === 0 && !issues.some((iss) => iss.code === 'FC_MISSING_TITLE')) {
    issues.push({
      code: 'FC_NO_CARDS_FOUND',
      message: 'No valid flashcards found in the markdown document.',
      line: lines.length,
      severity: 'ERROR',
    });
  }

  const hasBlockingErrors = issues.some((iss) => iss.severity === 'ERROR');

  return {
    success: !hasBlockingErrors && !!title && cards.length > 0,
    data:
      !hasBlockingErrors && title
        ? {
            title,
            description: description || undefined,
            cards,
          }
        : null,
    issues,
  };
}

/**
 * Serializes flashcard set to Markdown format (05_MARKDOWN_SPEC.md)
 */
export function exportFlashcardSetToMarkdown(set: {
  title: string;
  description?: string | null;
  cards: Array<{ front: string; back: string; position?: number }>;
}): string {
  const parts: string[] = [];

  parts.push(`# ${set.title}`);
  parts.push('');

  if (set.description) {
    parts.push(`Description: ${set.description}`);
    parts.push('');
  }

  const sortedCards = [...set.cards].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  sortedCards.forEach((card, index) => {
    parts.push(`## Card ${index + 1}`);
    parts.push('');
    parts.push('### Front');
    parts.push('');
    parts.push(card.front);
    parts.push('');
    parts.push('### Back');
    parts.push('');
    parts.push(card.back);
    parts.push('');
    if (index < sortedCards.length - 1) {
      parts.push('---');
      parts.push('');
    }
  });

  return parts.join('\n');
}
