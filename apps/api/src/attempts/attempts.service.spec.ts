import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AttemptStatus, QuestionType } from '@japanese-learning/contracts';
import { AttemptsService } from './attempts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AttemptsService (Phase 6 / TASK-060..063)', () => {
  let service: AttemptsService;
  let prismaMock: {
    exam: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    examAttempt: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    examAttemptAnswer: {
      upsert: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    examMistake: {
      upsert: ReturnType<typeof vi.fn>;
    };
    examBestResult: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const sampleDate = new Date('2026-08-26T00:00:00.000Z');

  const sampleExam = {
    id: 'exam-1',
    title: 'JLPT N3 Grammar Mock',
    contentVersion: 1,
    timeLimitSeconds: 1800,
    shuffleQuestions: false,
    shuffleOptions: false,
    questions: [
      {
        id: 'q-1',
        type: QuestionType.MULTIPLE_CHOICE_SINGLE,
        content: '日本へ＿＿前に、日本語を勉強しました。',
        position: 0,
        options: [
          { id: 'opt-1', content: '行く', isCorrect: true, position: 0 },
          { id: 'opt-2', content: '行った', isCorrect: false, position: 1 },
        ],
      },
      {
        id: 'q-2',
        type: QuestionType.MULTIPLE_CHOICE_SINGLE,
        content: '私は毎朝7時＿＿起きます。',
        position: 1,
        options: [
          { id: 'opt-3', content: 'を', isCorrect: false, position: 0 },
          { id: 'opt-4', content: 'に', isCorrect: true, position: 1 },
        ],
      },
    ],
  };

  beforeEach(() => {
    prismaMock = {
      exam: {
        findFirst: vi.fn().mockResolvedValue(sampleExam),
      },
      examAttempt: {
        create: vi.fn().mockResolvedValue({
          id: 'attempt-1',
          examId: 'exam-1',
          examVersion: 1,
          status: AttemptStatus.IN_PROGRESS,
          startedAt: sampleDate,
          expiresAt: new Date(sampleDate.getTime() + 1800 * 1000),
          questionOrderSnapshot: {
            examId: 'exam-1',
            examTitle: 'JLPT N3 Grammar Mock',
            examVersion: 1,
            timeLimitSeconds: 1800,
            questions: sampleExam.questions,
          },
        }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'attempt-1',
          examId: 'exam-1',
          examVersion: 1,
          status: AttemptStatus.IN_PROGRESS,
          startedAt: sampleDate,
          expiresAt: new Date(Date.now() + 1000000),
          questionOrderSnapshot: {
            examId: 'exam-1',
            examTitle: 'JLPT N3 Grammar Mock',
            examVersion: 1,
            timeLimitSeconds: 1800,
            questions: sampleExam.questions,
          },
          answers: [{ questionId: 'q-1', selectedOptionId: 'opt-1' }],
        }),
        update: vi.fn().mockResolvedValue({
          id: 'attempt-1',
          examId: 'exam-1',
          examVersion: 1,
          status: AttemptStatus.SUBMITTED,
          score: 100,
          durationSeconds: 120,
          startedAt: sampleDate,
          submittedAt: new Date(),
          answers: [
            { questionId: 'q-1', selectedOptionId: 'opt-1' },
            { questionId: 'q-2', selectedOptionId: 'opt-4' },
          ],
        }),
      },
      examAttemptAnswer: {
        upsert: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([
          { questionId: 'q-1', selectedOptionId: 'opt-1' },
          { questionId: 'q-2', selectedOptionId: 'opt-4' },
        ]),
      },
      examMistake: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      examBestResult: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'best-1', bestScore: 100 }),
        update: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn().mockImplementation((cb: (tx: unknown) => unknown) => cb(prismaMock)),
    };

    service = new AttemptsService(prismaMock as unknown as PrismaService);
  });

  describe('TASK-060 — Attempt start and snapshot (No leakage)', () => {
    it('creates attempt snapshot and NEVER leaks isCorrect in live response', async () => {
      const liveAttempt = await service.startAttempt('exam-1');

      expect(liveAttempt.attemptId).toBe('attempt-1');
      expect(liveAttempt.totalQuestions).toBe(2);
      expect(liveAttempt.questions).toHaveLength(2);

      // Verify no isCorrect in question options
      liveAttempt.questions.forEach((q) => {
        q.options.forEach((opt) => {
          expect((opt as unknown as Record<string, unknown>).isCorrect).toBeUndefined();
        });
      });
    });

    it('rejects starting attempt on exam with 0 questions', async () => {
      prismaMock.exam.findFirst.mockResolvedValueOnce({
        id: 'exam-empty',
        questions: [],
      });

      await expect(service.startAttempt('exam-empty')).rejects.toThrow(BadRequestException);
    });
  });

  describe('TASK-061 — In-progress answer persistence', () => {
    it('saves answers for valid questions and options', async () => {
      const result = await service.saveAnswers('attempt-1', {
        answers: [{ questionId: 'q-1', selectedOptionId: 'opt-1' }],
      });

      expect(result.success).toBe(true);
      expect(prismaMock.examAttemptAnswer.upsert).toHaveBeenCalled();
    });

    it('rejects answer for invalid question ID', async () => {
      await expect(
        service.saveAnswers('attempt-1', {
          answers: [{ questionId: 'unknown-q', selectedOptionId: 'opt-1' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects answer for invalid option ID not belonging to question', async () => {
      await expect(
        service.saveAnswers('attempt-1', {
          answers: [{ questionId: 'q-1', selectedOptionId: 'opt-4' }], // opt-4 belongs to q-2!
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('TASK-062 & TASK-063 — Submission, scoring, and best results', () => {
    it('returns a submitted graded result without exposing a live-attempt payload path', async () => {
      prismaMock.examAttempt.findUnique.mockResolvedValueOnce({
        id: 'attempt-1',
        examId: 'exam-1',
        examVersion: 1,
        isPractice: false,
        status: AttemptStatus.SUBMITTED,
        score: 50,
        durationSeconds: 120,
        startedAt: sampleDate,
        submittedAt: new Date(sampleDate.getTime() + 120_000),
        questionOrderSnapshot: {
          examId: 'exam-1',
          examTitle: 'JLPT N3 Grammar Mock',
          examVersion: 1,
          timeLimitSeconds: 1800,
          questions: sampleExam.questions,
        },
        answers: [{ questionId: 'q-1', selectedOptionId: 'opt-2' }],
      });

      const result = await service.getSubmittedResult('attempt-1');

      expect(result.status).toBe(AttemptStatus.SUBMITTED);
      expect(result.questions[0].correctOptionId).toBe('opt-1');
      expect(result.questions[0].options[0].isCorrect).toBe(true);
    });

    it('rejects submitted-review reads for an in-progress attempt', async () => {
      await expect(service.getSubmittedResult('attempt-1')).rejects.toThrow(BadRequestException);
    });

    it('derives wrong and unanswered questions into the bounded review source', async () => {
      prismaMock.examAttemptAnswer.findMany.mockResolvedValueOnce([
        { questionId: 'q-1', selectedOptionId: 'opt-2' },
      ]);

      await service.submitAttempt('attempt-1');

      expect(prismaMock.examMistake.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.examMistake.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          create: expect.objectContaining({
            examId: 'exam-1',
            examVersion: 1,
            questionId: 'q-1',
            selectedOptionId: 'opt-2',
            sourceAttemptId: 'attempt-1',
          }),
        }),
      );
      expect(prismaMock.examMistake.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          create: expect.objectContaining({
            questionId: 'q-2',
            selectedOptionId: null,
          }),
        }),
      );
    });

    it('evaluates score accurately and records new best score', async () => {
      const graded = await service.submitAttempt('attempt-1');

      expect(graded.score).toBe(100);
      expect(graded.correctCount).toBe(2);
      expect(graded.totalQuestions).toBe(2);
      expect(graded.isNewBest).toBe(true);
      expect(graded.questions[0].isCorrect).toBe(true);
      expect(graded.questions[1].isCorrect).toBe(true);
      expect(prismaMock.examBestResult.create).toHaveBeenCalled();
    });

    it('is idempotent on duplicate submit', async () => {
      prismaMock.examAttempt.findUnique.mockResolvedValueOnce({
        id: 'attempt-1',
        examId: 'exam-1',
        examVersion: 1,
        status: AttemptStatus.SUBMITTED,
        score: 100,
        durationSeconds: 120,
        startedAt: sampleDate,
        submittedAt: sampleDate,
        questionOrderSnapshot: {
          examId: 'exam-1',
          examTitle: 'JLPT N3 Grammar Mock',
          examVersion: 1,
          timeLimitSeconds: 1800,
          questions: sampleExam.questions,
        },
        answers: [
          { questionId: 'q-1', selectedOptionId: 'opt-1' },
          { questionId: 'q-2', selectedOptionId: 'opt-4' },
        ],
      });

      const graded = await service.submitAttempt('attempt-1');

      expect(graded.score).toBe(100);
      expect(prismaMock.examAttempt.update).not.toHaveBeenCalled();
    });

    it('does not overwrite higher best score with lower score', async () => {
      // Previous best was 100%
      prismaMock.examBestResult.findUnique.mockResolvedValueOnce({
        id: 'best-1',
        bestScore: 100,
        attemptCount: 1,
      });

      // Current attempt only scored 50%
      prismaMock.examAttemptAnswer.findMany.mockResolvedValueOnce([
        { questionId: 'q-1', selectedOptionId: 'opt-1' },
        { questionId: 'q-2', selectedOptionId: 'opt-3' }, // wrong!
      ]);

      const graded = await service.submitAttempt('attempt-1');

      expect(graded.isNewBest).toBe(false);
      expect(graded.bestScore).toBe(100);
    });

    it('keeps practice submissions out of official best scores and mistake history', async () => {
      prismaMock.examAttempt.findUnique.mockResolvedValueOnce({
        id: 'practice-1',
        examId: 'exam-1',
        examVersion: 1,
        isPractice: true,
        status: AttemptStatus.IN_PROGRESS,
        score: null,
        durationSeconds: null,
        startedAt: sampleDate,
        submittedAt: null,
        expiresAt: null,
        questionOrderSnapshot: {
          examId: 'exam-1',
          examTitle: 'JLPT N3 Grammar Mock',
          examVersion: 1,
          timeLimitSeconds: null,
          isPractice: true,
          questions: sampleExam.questions,
        },
        answers: [],
      });
      prismaMock.examAttemptAnswer.findMany.mockResolvedValueOnce([
        { questionId: 'q-1', selectedOptionId: 'opt-2' },
      ]);
      prismaMock.examAttempt.update.mockResolvedValueOnce({
        id: 'practice-1',
        examId: 'exam-1',
        examVersion: 1,
        isPractice: true,
        status: AttemptStatus.SUBMITTED,
        score: 0,
        durationSeconds: 2,
        startedAt: sampleDate,
        submittedAt: new Date(),
        answers: [{ questionId: 'q-1', selectedOptionId: 'opt-2' }],
      });

      const graded = await service.submitAttempt('practice-1');

      expect(graded.isPractice).toBe(true);
      expect(graded.isNewBest).toBe(false);
      expect(prismaMock.examBestResult.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.examBestResult.create).not.toHaveBeenCalled();
      expect(prismaMock.examBestResult.update).not.toHaveBeenCalled();
      expect(prismaMock.examMistake.upsert).not.toHaveBeenCalled();
    });
  });
});
