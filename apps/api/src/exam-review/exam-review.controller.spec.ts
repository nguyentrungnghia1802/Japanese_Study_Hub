import { describe, expect, it, vi } from 'vitest';
import { ExamReviewController } from './exam-review.controller.js';

describe('ExamReviewController (TASK-473)', () => {
  it('delegates retained attempt history, detail, and frequent-mistake routes', async () => {
    const service = {
      getMistakeAttempts: vi.fn().mockResolvedValue({ attempts: [] }),
      getMistakeAttemptDetail: vi.fn().mockResolvedValue({ attempt: {}, items: [] }),
      getFrequentMistakes: vi.fn().mockResolvedValue({ items: [] }),
    };
    const controller = new ExamReviewController(service as never);

    await expect(controller.getMistakeAttempts('exam-1')).resolves.toEqual({ attempts: [] });
    await expect(controller.getMistakeAttemptDetail('attempt-1')).resolves.toEqual({
      attempt: {},
      items: [],
    });
    await expect(controller.getFrequentMistakes('exam-1')).resolves.toEqual({ items: [] });

    expect(service.getMistakeAttempts).toHaveBeenCalledWith('exam-1');
    expect(service.getMistakeAttemptDetail).toHaveBeenCalledWith('attempt-1');
    expect(service.getFrequentMistakes).toHaveBeenCalledWith('exam-1');
  });
});
