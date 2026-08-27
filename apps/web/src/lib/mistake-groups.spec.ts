import { describe, expect, it } from 'vitest';
import { QuestionType, type WrongAnswerReviewItemDto } from '@japanese-learning/contracts';
import { groupMistakesByExam } from './mistake-groups.js';

function makeMistake(
  id: string,
  examId: string,
  examTitle: string,
  examVersion = 1,
): WrongAnswerReviewItemDto {
  return {
    id,
    examId,
    examTitle,
    examVersion,
    questionId: `question-${id}`,
    questionType: QuestionType.MULTIPLE_CHOICE_SINGLE,
    questionContent: `Question ${id}`,
    options: [],
    selectedOptionId: null,
    sourceAttemptId: `attempt-${id}`,
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
  };
}

describe('groupMistakesByExam', () => {
  it('keeps each Exam and content version in an independent display group', () => {
    const items = [
      makeMistake('a', 'exam-a', 'N5 Vocabulary'),
      makeMistake('b', 'exam-a', 'N5 Vocabulary'),
      makeMistake('c', 'exam-b', 'N4 Grammar'),
      makeMistake('d', 'exam-a', 'N5 Vocabulary', 2),
    ];

    expect(groupMistakesByExam(items)).toEqual([
      expect.objectContaining({
        examId: 'exam-a',
        examVersion: 1,
        items: [items[0], items[1]],
      }),
      expect.objectContaining({ examId: 'exam-b', examVersion: 1, items: [items[2]] }),
      expect.objectContaining({ examId: 'exam-a', examVersion: 2, items: [items[3]] }),
    ]);
  });

  it('returns an empty list for an empty queue', () => {
    expect(groupMistakesByExam([])).toEqual([]);
  });
});
