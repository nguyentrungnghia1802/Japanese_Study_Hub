import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AttemptStatus, QuestionType } from '@japanese-learning/contracts';
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
    expect(deleteMany).toHaveBeenNthCalledWith(2, {
      where: { examId: 'exam-1', userKey: 'primary_user' },
    });
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

describe('ExamReviewService (TASK-473 retained official history)', () => {
  const attemptsService = { getAttempt: vi.fn() };
  const liveQuestion = {
    id: 'question-1',
    type: QuestionType.MULTIPLE_CHOICE_SINGLE,
    content: 'live content changed later',
    position: 9,
    options: [
      { id: 'option-wrong', content: 'live wrong', position: 0 },
      { id: 'option-right', content: 'live right', position: 1 },
    ],
  };
  const makeMistake = (overrides: Record<string, unknown> = {}) => ({
    id: 'mistake-1',
    examId: 'exam-1',
    examVersion: 3,
    questionId: 'question-1',
    sourceAttemptId: 'attempt-3',
    questionTypeSnapshot: QuestionType.MULTIPLE_CHOICE_SINGLE,
    questionContentSnapshot: 'historical content from submission',
    optionSnapshot: [
      { id: 'option-right', content: 'historical right', position: 1 },
      { id: 'option-wrong', content: 'historical wrong', position: 0 },
    ],
    questionPosition: 0,
    selectedOptionId: 'option-wrong',
    correctOptionId: 'option-right',
    isCorrect: false,
    isUnanswered: false,
    submittedAt: new Date('2026-08-27T03:00:00.000Z'),
    createdAt: new Date('2026-08-27T03:00:00.000Z'),
    updatedAt: new Date('2026-08-27T03:00:00.000Z'),
    exam: { id: 'exam-1', title: 'N3', deletedAt: null, contentVersion: 3 },
    question: liveQuestion,
    ...overrides,
  });

  it('returns newest retained attempt summaries with official/version filters', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'exam-1', title: 'N3', contentVersion: 3 });
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'attempt-3',
        examId: 'exam-1',
        examVersion: 3,
        submittedAt: new Date('2026-08-27T03:00:00.000Z'),
        score: 75,
        correctCount: 3,
        totalQuestions: 4,
        durationSeconds: 90,
        _count: { mistakes: 1 },
      },
      {
        id: 'attempt-2',
        examId: 'exam-1',
        examVersion: 3,
        submittedAt: new Date('2026-08-26T03:00:00.000Z'),
        score: 50,
        correctCount: 2,
        totalQuestions: 4,
        durationSeconds: 120,
        _count: { mistakes: 2 },
      },
      {
        id: 'attempt-1',
        examId: 'exam-1',
        examVersion: 3,
        submittedAt: new Date('2026-08-25T03:00:00.000Z'),
        score: 25,
        correctCount: 1,
        totalQuestions: 4,
        durationSeconds: null,
        _count: { mistakes: 3 },
      },
    ]);
    const service = new ExamReviewService(
      { exam: { findFirst }, examAttempt: { findMany } } as unknown as PrismaService,
      attemptsService as unknown as AttemptsService,
    );

    const result = await service.getMistakeAttempts('exam-1');

    expect(result.attempts.map((attempt) => attempt.attemptId)).toEqual([
      'attempt-3',
      'attempt-2',
      'attempt-1',
    ]);
    expect(result.attempts[0]).toMatchObject({ score: 75, correctCount: 3, examVersion: 3 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          examId: 'exam-1',
          examVersion: 3,
          userKey: 'primary_user',
          status: AttemptStatus.SUBMITTED,
          isPractice: false,
        },
        take: 3,
      }),
    );
  });

  it('renders retained detail from immutable snapshots, not changed live content', async () => {
    const attempt = {
      id: 'attempt-3',
      examId: 'exam-1',
      examVersion: 3,
      userKey: 'primary_user',
      status: AttemptStatus.SUBMITTED,
      isPractice: false,
      score: 75,
      correctCount: 3,
      totalQuestions: 4,
      durationSeconds: 90,
      submittedAt: new Date('2026-08-27T03:00:00.000Z'),
      startedAt: new Date('2026-08-27T02:58:30.000Z'),
      exam: { title: 'N3', contentVersion: 3, deletedAt: null },
    };
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'attempt-3',
          examId: 'exam-1',
          examVersion: 3,
          submittedAt: attempt.submittedAt,
          score: 75,
          correctCount: 3,
          totalQuestions: 4,
          durationSeconds: 90,
          _count: { mistakes: 1 },
        },
      ])
      .mockResolvedValueOnce([makeMistake()]);
    const service = new ExamReviewService(
      {
        examAttempt: { findUnique: vi.fn().mockResolvedValue(attempt), findMany },
        examMistake: { findMany },
      } as unknown as PrismaService,
      attemptsService as unknown as AttemptsService,
    );

    const result = await service.getMistakeAttemptDetail('attempt-3');

    expect(result.attempt.attemptId).toBe('attempt-3');
    expect(result.items[0]).toMatchObject({
      questionContent: 'historical content from submission',
      selectedOptionId: 'option-wrong',
      correctOptionId: 'option-right',
      isUnanswered: false,
    });
    expect(result.items[0].options).toEqual([
      { id: 'option-wrong', content: 'historical wrong', position: 0, isCorrect: false },
      { id: 'option-right', content: 'historical right', position: 1, isCorrect: true },
    ]);
  });

  it('rejects detail that has fallen outside the retained three', async () => {
    const service = new ExamReviewService(
      {
        examAttempt: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'attempt-old',
            examId: 'exam-1',
            examVersion: 3,
            userKey: 'primary_user',
            status: AttemptStatus.SUBMITTED,
            isPractice: false,
            score: 10,
            correctCount: 1,
            totalQuestions: 10,
            durationSeconds: 100,
            submittedAt: new Date(),
            startedAt: new Date(),
            exam: { title: 'N3', contentVersion: 3, deletedAt: null },
          }),
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as unknown as PrismaService,
      attemptsService as unknown as AttemptsService,
    );

    await expect(service.getMistakeAttemptDetail('attempt-old')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('ranks frequent mistakes over retained attempts and reports the denominator', async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([
        { id: 'attempt-2', examId: 'exam-1', examVersion: 3 },
        { id: 'attempt-1', examId: 'exam-1', examVersion: 3 },
      ])
      .mockResolvedValueOnce([
        makeMistake({ id: 'mistake-new', sourceAttemptId: 'attempt-2' }),
        makeMistake({ id: 'mistake-old', sourceAttemptId: 'attempt-1' }),
        makeMistake({
          id: 'mistake-other',
          questionId: 'question-2',
          sourceAttemptId: 'attempt-2',
          questionContentSnapshot: 'other question',
          questionPosition: 1,
        }),
      ]);
    const service = new ExamReviewService(
      {
        exam: { findFirst: vi.fn().mockResolvedValue({ id: 'exam-1', contentVersion: 3 }) },
        examAttempt: { findMany },
        examMistake: { findMany },
      } as unknown as PrismaService,
      attemptsService as unknown as AttemptsService,
    );

    const result = await service.getFrequentMistakes('exam-1');

    expect(result.retainedAttemptCount).toBe(2);
    expect(result.items[0]).toMatchObject({
      questionId: 'question-1',
      occurrenceCount: 2,
      retainedAttemptCount: 2,
    });
    expect(result.items[1].occurrenceCount).toBe(1);
  });
});
