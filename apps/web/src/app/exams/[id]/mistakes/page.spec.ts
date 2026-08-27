import { describe, expect, it } from 'vitest';
import {
  QuestionType,
  type FrequentMistakeDto,
  type RetainedMistakeItemDto,
} from '@japanese-learning/contracts';
import ExamMistakeHistoryPage, {
  createFrequentMistakeFlashcardDraft,
  createMistakeFlashcardDraft,
} from './page.js';

describe('ExamMistakeHistoryPage (TASK-480/481)', () => {
  it('exports the history route and creates a concise editable card draft', () => {
    const item = {
      id: '11111111-1111-4111-8111-111111111111',
      examId: '22222222-2222-4222-8222-222222222222',
      examTitle: 'N3',
      examVersion: 2,
      questionId: '33333333-3333-4333-8333-333333333333',
      questionType: QuestionType.MULTIPLE_CHOICE_SINGLE,
      questionContent: '日本へ行く前に何をしましたか。',
      questionPosition: 0,
      options: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          content: '勉強しました',
          position: 0,
          isCorrect: true,
        },
        {
          id: '55555555-5555-4555-8555-555555555555',
          content: '寝ました',
          position: 1,
          isCorrect: false,
        },
      ],
      selectedOptionId: '55555555-5555-4555-8555-555555555555',
      correctOptionId: '44444444-4444-4444-8444-444444444444',
      isCorrect: false,
      isUnanswered: false,
      sourceAttemptId: '66666666-6666-4666-8666-666666666666',
      submittedAt: '2026-08-27T00:00:00.000Z',
      createdAt: '2026-08-27T00:00:00.000Z',
      updatedAt: '2026-08-27T00:00:00.000Z',
    } satisfies RetainedMistakeItemDto;

    expect(typeof ExamMistakeHistoryPage).toBe('function');
    expect(createMistakeFlashcardDraft(item)).toEqual({
      front: '日本へ行く前に何をしましたか。',
      back: 'Đáp án đúng: 勉強しました\nĐã chọn: 寝ました',
    });

    const frequent = {
      ...item,
      questionContent: 'Câu lặp lại',
      occurrenceCount: 2,
      retainedAttemptCount: 3,
    } satisfies FrequentMistakeDto;
    expect(createFrequentMistakeFlashcardDraft(frequent)).toEqual({
      front: 'Câu lặp lại',
      back: 'Đáp án đúng: 勉強しました',
    });
  });
});
