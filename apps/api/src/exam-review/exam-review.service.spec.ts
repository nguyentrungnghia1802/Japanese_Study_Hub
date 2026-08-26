import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AttemptsService } from '../attempts/attempts.service.js';
import { ExamReviewService } from './exam-review.service.js';

describe('ExamReviewService (TASK-260)', () => {
  const attemptsService = { getAttempt: vi.fn() };
  const question = {
    id: 'question-1',
    type: 'MULTIPLE_CHOICE_SINGLE',
    content: '日本語の質問',
    position: 0,
    options: [
      { id: 'option-1', content: '答え A', position: 0 },
      { id: 'option-2', content: '答え B', position: 1 },
    ],
  };

  it('returns bounded prompt/options and removes stale content versions', async () => {
    const prisma = {
      examMistake: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'mistake-valid',
            examId: 'exam-1',
            examVersion: 2,
            questionId: question.id,
            sourceAttemptId: 'attempt-1',
            selectedOptionId: 'option-2',
            createdAt: new Date('2026-08-26T00:00:00.000Z'),
            updatedAt: new Date('2026-08-26T00:01:00.000Z'),
            exam: { id: 'exam-1', title: 'N3', deletedAt: null, contentVersion: 2 },
            question,
          },
          {
            id: 'mistake-stale',
            examId: 'exam-1',
            examVersion: 1,
            questionId: 'question-2',
            sourceAttemptId: 'attempt-0',
            selectedOptionId: null,
            createdAt: new Date('2026-08-25T00:00:00.000Z'),
            updatedAt: new Date('2026-08-25T00:01:00.000Z'),
            exam: { id: 'exam-1', title: 'N3', deletedAt: null, contentVersion: 2 },
            question,
          },
        ]),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new ExamReviewService(
      prisma as unknown as PrismaService,
      attemptsService as unknown as AttemptsService,
    );

    const result = await service.getMistakes(undefined, 20);

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'mistake-valid',
      examVersion: 2,
      selectedOptionId: 'option-2',
    });
    expect(result.items[0].options[0]).not.toHaveProperty('isCorrect');
    expect(prisma.examMistake.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['mistake-stale'] } },
    });
  });

  it('dismisses one mistake and reports a missing id', async () => {
    const deleteMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const service = new ExamReviewService(
      {
        examMistake: { findMany: vi.fn(), deleteMany },
      } as unknown as PrismaService,
      attemptsService as unknown as AttemptsService,
    );

    await expect(service.dismissMistake('mistake-1')).resolves.toEqual({ success: true });
    await expect(service.dismissMistake('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('clears all mistakes or only one exam scope', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 3 });
    const service = new ExamReviewService(
      {
        examMistake: { findMany: vi.fn(), deleteMany },
      } as unknown as PrismaService,
      attemptsService as unknown as AttemptsService,
    );

    await expect(service.clearMistakes()).resolves.toEqual({ success: true, removedCount: 3 });
    await expect(service.clearMistakes('exam-1')).resolves.toEqual({
      success: true,
      removedCount: 3,
    });
    expect(deleteMany).toHaveBeenNthCalledWith(2, { where: { examId: 'exam-1' } });
  });

  it('creates an untimed sanitized practice snapshot from current-version mistakes', async () => {
    const exam = { id: 'exam-1', title: 'N3', contentVersion: 2 };
    const practiceQuestion = {
      ...question,
      options: [
        { id: 'option-1', content: '答え A', position: 0, isCorrect: true },
        { id: 'option-2', content: '答え B', position: 1, isCorrect: false },
      ],
    };
    const findFirst = vi.fn().mockResolvedValue(exam);
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'mistake-valid',
        examId: 'exam-1',
        examVersion: 2,
        questionId: question.id,
        exam,
        question: practiceQuestion,
      },
    ]);
    const create = vi.fn().mockResolvedValue({ id: 'practice-1' });
    attemptsService.getAttempt.mockResolvedValue({
      attemptId: 'practice-1',
      examId: 'exam-1',
      examTitle: 'N3',
      examVersion: 2,
      timeLimitSeconds: null,
      startedAt: '2026-08-26T00:00:00.000Z',
      expiresAt: null,
      status: 'IN_PROGRESS',
      totalQuestions: 1,
      questions: [
        {
          id: question.id,
          type: question.type,
          content: question.content,
          position: 0,
          options: [
            { id: 'option-1', content: '答え A', position: 0 },
            { id: 'option-2', content: '答え B', position: 1 },
          ],
        },
      ],
      savedAnswers: {},
      isPractice: true,
    });

    const service = new ExamReviewService(
      {
        exam: { findFirst },
        examMistake: { findMany, deleteMany: vi.fn() },
        examAttempt: { create },
      } as unknown as PrismaService,
      attemptsService as unknown as AttemptsService,
    );

    const result = await service.startPractice({
      examId: 'exam-1',
      mistakeIds: ['mistake-valid'],
    });

    expect(result.isPractice).toBe(true);
    expect(result.timeLimitSeconds).toBeNull();
    expect(result.questions[0].options[0]).not.toHaveProperty('isCorrect');
    const createData = create.mock.calls[0][0].data;
    expect(createData).toMatchObject({
      examId: 'exam-1',
      examVersion: 2,
      isPractice: true,
      totalQuestions: 1,
    });
    expect(createData.questionOrderSnapshot).toMatchObject({
      timeLimitSeconds: null,
      isPractice: true,
    });
    expect(createData.questionOrderSnapshot.questions[0].options[0].isCorrect).toBe(true);
  });
});
