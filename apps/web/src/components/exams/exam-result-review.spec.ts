import { describe, expect, it } from 'vitest';
import ExamResultReview, { getReviewPath } from './exam-result-review.js';

describe('ExamResultReview (TASK-453)', () => {
  it('exports the submitted-only review workspace', () => {
    expect(typeof ExamResultReview).toBe('function');
  });

  it('encodes the selected review filter and question into the lookup return path', () => {
    expect(
      getReviewPath(
        '11111111-1111-4111-8111-111111111111',
        'WRONG',
        '22222222-2222-4222-8222-222222222222',
      ),
    ).toBe(
      '/exams/review/11111111-1111-4111-8111-111111111111?filter=WRONG&question=22222222-2222-4222-8222-222222222222',
    );
  });
});
