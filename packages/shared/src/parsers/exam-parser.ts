import {
  QuestionType,
  ImportErrorDetailDto,
  CreateExamQuestionDto,
  CreateExamOptionDto,
} from '@japanese-learning/contracts';

export interface ParsedExamData {
  title: string;
  description?: string | null;
  timeLimitSeconds?: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: CreateExamQuestionDto[];
}

export interface ExamParseResult {
  success: boolean;
  data: ParsedExamData | null;
  issues: ImportErrorDetailDto[];
}

interface RawQuestion {
  number: number;
  contentLines: string[];
  options: Array<{ label: string; content: string; position: number }>;
  startLine: number;
}

/**
 * Pure Exam Markdown Parser according to 05_MARKDOWN_SPEC.md
 */
export function parseExamMarkdown(rawContent: string): ExamParseResult {
  const issues: ImportErrorDetailDto[] = [];
  const lines = rawContent.split(/\r?\n/);

  let title: string | null = null;
  let description: string | null = null;
  let timeLimitSeconds: number | null = null;
  let shuffleQuestions = false;
  let shuffleOptions = false;

  let inCodeBlock = false;
  let inAnswerKey = false;
  const rawQuestions: RawQuestion[] = [];
  let currentQ: RawQuestion | null = null;
  const answerKeys = new Map<number, string>(); // questionNumber -> optionLabel ('A', 'B', etc.)
  const seenQuestionNumbers = new Set<number>();

  const flushQuestion = (lineNum: number) => {
    if (currentQ !== null) {
      const prompt = currentQ.contentLines.join('\n').trim();

      if (!prompt) {
        issues.push({
          code: 'EX_EMPTY_PROMPT',
          message: `Question ${currentQ.number} has empty question prompt content.`,
          line: currentQ.startLine,
          question: currentQ.number,
          severity: 'ERROR',
        });
      }

      if (currentQ.options.length < 2 || currentQ.options.length > 6) {
        issues.push({
          code: 'EX_INVALID_OPTION_COUNT',
          message: `Question ${currentQ.number} must have between 2 and 6 options (found ${currentQ.options.length}).`,
          line: lineNum,
          question: currentQ.number,
          severity: 'ERROR',
        });
      }

      rawQuestions.push(currentQ);
    }
    currentQ = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    const trimmed = line.trim();

    // Toggle fenced code block
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (currentQ && !inAnswerKey) {
        currentQ.contentLines.push(line);
      }
      continue;
    }

    if (inCodeBlock) {
      if (currentQ && !inAnswerKey) {
        currentQ.contentLines.push(line);
      }
      continue;
    }

    // Top-level H1 (Title or Answer Key)
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      const h1Text = trimmed.slice(2).trim();

      if (h1Text.toUpperCase() === 'ANSWER KEY') {
        flushQuestion(lineNumber);
        inAnswerKey = true;
        continue;
      }

      if (!title && !inAnswerKey && currentQ === null) {
        title = h1Text;
        continue;
      }
    }

    // Answer Key processing
    if (inAnswerKey) {
      if (!trimmed) continue;
      // Format: <number>: <label> e.g. "1: A" or "1:A"
      const keyMatch = trimmed.match(/^(\d+)\s*:\s*([a-zA-Z])/);
      if (keyMatch) {
        const qNum = parseInt(keyMatch[1], 10);
        const label = keyMatch[2].toUpperCase();

        if (answerKeys.has(qNum)) {
          issues.push({
            code: 'EX_DUPLICATE_KEY_ENTRY',
            message: `Duplicate answer key entry for question ${qNum}.`,
            line: lineNumber,
            question: qNum,
            severity: 'ERROR',
          });
        }
        answerKeys.set(qNum, label);
      }
      continue;
    }

    // Metadata lines before first question
    if (currentQ === null && rawQuestions.length === 0) {
      const lower = trimmed.toLowerCase();

      if (lower.startsWith('time:')) {
        const val = trimmed.slice(5).trim();
        const mins = parseInt(val, 10);
        if (isNaN(mins) || mins <= 0) {
          issues.push({
            code: 'EX_INVALID_TIME',
            message: `Time limit must be a positive integer in minutes (received '${val}').`,
            line: lineNumber,
            severity: 'ERROR',
          });
        } else {
          timeLimitSeconds = mins * 60;
        }
        continue;
      }

      if (lower.startsWith('shuffle questions:')) {
        const val = trimmed.slice(18).trim().toLowerCase();
        shuffleQuestions = val === 'true';
        continue;
      }

      if (lower.startsWith('shuffle options:')) {
        const val = trimmed.slice(16).trim().toLowerCase();
        shuffleOptions = val === 'true';
        continue;
      }

      if (lower.startsWith('description:')) {
        description = trimmed.slice(12).trim();
        continue;
      }
    }

    // Question Header: ## Question <number>
    const questionMatch = trimmed.match(/^##\s+Question\s+(\d+)/i);
    if (questionMatch) {
      flushQuestion(lineNumber);
      const qNum = parseInt(questionMatch[1], 10);

      if (seenQuestionNumbers.has(qNum)) {
        issues.push({
          code: 'EX_DUPLICATE_QUESTION_NUMBER',
          message: `Duplicate question number: ${qNum}.`,
          line: lineNumber,
          question: qNum,
          severity: 'ERROR',
        });
      }
      seenQuestionNumbers.add(qNum);

      currentQ = {
        number: qNum,
        contentLines: [],
        options: [],
        startLine: lineNumber,
      };
      continue;
    }

    // Option line within question: - A. <content> or * A. <content>
    const optionMatch = trimmed.match(/^[-*]\s+([A-Fa-f])\.\s*(.+)$/);
    if (optionMatch && currentQ) {
      const label = optionMatch[1].toUpperCase();
      const optContent = optionMatch[2].trim();

      if (currentQ.options.some((o) => o.label === label)) {
        issues.push({
          code: 'EX_DUPLICATE_OPTION_LABEL',
          message: `Question ${currentQ.number} has duplicate option label '${label}'.`,
          line: lineNumber,
          question: currentQ.number,
          severity: 'ERROR',
        });
      }

      currentQ.options.push({
        label,
        content: optContent,
        position: currentQ.options.length,
      });
      continue;
    }

    // Accumulate question prompt content
    if (currentQ) {
      currentQ.contentLines.push(line);
    }
  }

  // Flush last question if any
  flushQuestion(lines.length);

  // Validation checks
  if (!title) {
    issues.push({
      code: 'EX_MISSING_TITLE',
      message: 'Exam Markdown must begin with an H1 (# <Title>) heading.',
      line: 1,
      severity: 'ERROR',
    });
  }

  if (rawQuestions.length === 0) {
    issues.push({
      code: 'EX_NO_QUESTIONS',
      message: 'No questions found in exam Markdown document.',
      line: lines.length,
      severity: 'ERROR',
    });
  }

  if (!inAnswerKey || answerKeys.size === 0) {
    issues.push({
      code: 'EX_MISSING_ANSWER_KEY',
      message: 'Exam must include an # ANSWER KEY section at the end.',
      line: lines.length,
      severity: 'ERROR',
    });
  }

  // Correlate questions with answer key
  const finalQuestions: CreateExamQuestionDto[] = [];

  for (let qIdx = 0; qIdx < rawQuestions.length; qIdx++) {
    const rawQ = rawQuestions[qIdx];
    const correctLabel = answerKeys.get(rawQ.number);

    if (!correctLabel) {
      issues.push({
        code: 'EX_MISSING_KEY_FOR_QUESTION',
        message: `Answer key is missing entry for Question ${rawQ.number}.`,
        question: rawQ.number,
        severity: 'ERROR',
      });
      continue;
    }

    const matchingOption = rawQ.options.find((o) => o.label === correctLabel);
    if (!matchingOption) {
      issues.push({
        code: 'EX_INVALID_KEY_OPTION',
        message: `Answer key option '${correctLabel}' does not exist in Question ${rawQ.number}.`,
        question: rawQ.number,
        severity: 'ERROR',
      });
      continue;
    }

    const options: CreateExamOptionDto[] = rawQ.options.map((opt) => ({
      content: opt.content,
      isCorrect: opt.label === correctLabel,
      position: opt.position,
    }));

    finalQuestions.push({
      type: QuestionType.MULTIPLE_CHOICE_SINGLE,
      content: rawQ.contentLines.join('\n').trim(),
      position: qIdx,
      options,
    });
  }

  // Check for orphan answer key entries
  for (const [keyQNum] of answerKeys.entries()) {
    if (!rawQuestions.some((q) => q.number === keyQNum)) {
      issues.push({
        code: 'EX_ORPHAN_KEY_ENTRY',
        message: `Answer key references question number ${keyQNum}, which does not exist in the exam.`,
        question: keyQNum,
        severity: 'ERROR',
      });
    }
  }

  const hasBlockingErrors = issues.some((i) => i.severity === 'ERROR');

  return {
    success: !hasBlockingErrors && !!title && finalQuestions.length > 0,
    data:
      !hasBlockingErrors && title
        ? {
            title,
            description,
            timeLimitSeconds,
            shuffleQuestions,
            shuffleOptions,
            questions: finalQuestions,
          }
        : null,
    issues,
  };
}

/**
 * Serializes exam structure into canonical Markdown format (05_MARKDOWN_SPEC.md)
 */
export function exportExamToMarkdown(exam: {
  title: string;
  description?: string | null;
  timeLimitSeconds?: number | null;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  questions?: Array<{
    type?: QuestionType;
    content: string;
    position?: number;
    options: Array<{ content: string; isCorrect?: boolean; position?: number }>;
  }>;
}): string {
  const parts: string[] = [];

  parts.push(`# ${exam.title}`);
  parts.push('');

  if (exam.description) {
    parts.push(`Description: ${exam.description}`);
  }

  if (exam.timeLimitSeconds && exam.timeLimitSeconds > 0) {
    const mins = Math.round(exam.timeLimitSeconds / 60);
    parts.push(`Time: ${mins}`);
  }

  if (exam.shuffleQuestions !== undefined) {
    parts.push(`Shuffle Questions: ${exam.shuffleQuestions}`);
  }

  if (exam.shuffleOptions !== undefined) {
    parts.push(`Shuffle Options: ${exam.shuffleOptions}`);
  }

  parts.push('');

  const questions = [...(exam.questions || [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
  const answerEntries: string[] = [];
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  questions.forEach((q, qIndex) => {
    const qNum = qIndex + 1;
    parts.push(`## Question ${qNum}`);
    parts.push('');
    parts.push(q.content);
    parts.push('');

    const sortedOpts = [...q.options].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    sortedOpts.forEach((opt, optIndex) => {
      const letter = optionLetters[optIndex] || String.fromCharCode(65 + optIndex);
      parts.push(`- ${letter}. ${opt.content}`);
      if (opt.isCorrect) {
        answerEntries.push(`${qNum}: ${letter}`);
      }
    });

    parts.push('');
  });

  parts.push('# ANSWER KEY');
  parts.push('');
  answerEntries.forEach((entry) => {
    parts.push(entry);
  });
  parts.push('');

  return parts.join('\n');
}
