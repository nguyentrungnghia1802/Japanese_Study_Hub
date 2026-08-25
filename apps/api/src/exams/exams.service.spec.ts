import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { QuestionType } from '@japanese-learning/contracts';
import { ExamsService } from './exams.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ExamsService (TASK-051 / EXAM-001..007, QUESTION-001..009)', () => {
  let service: ExamsService;
  let prismaMock: {
    exam: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
    };
    examQuestion: {
      create: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    examOption: {
      createMany: ReturnType<typeof vi.fn>;
    };
    examFolder: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const sampleDate = new Date('2026-08-26T00:00:00.000Z');

  const validQuestions = [
    {
      type: QuestionType.MULTIPLE_CHOICE_SINGLE,
      content: '日本へ＿＿前に、日本語を勉強しました。',
      position: 0,
      options: [
        { content: '行く', isCorrect: true, position: 0 },
        { content: '行った', isCorrect: false, position: 1 },
        { content: '行き', isCorrect: false, position: 2 },
        { content: '行って', isCorrect: false, position: 3 },
      ],
    },
  ];

  beforeEach(() => {
    prismaMock = {
      exam: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'exam-1',
          title: 'JLPT N3 Grammar Mock',
          description: 'Description',
          folderId: null,
          coverRef: null,
          timeLimitSeconds: 1800,
          contentVersion: 1,
          shuffleQuestions: false,
          shuffleOptions: false,
          createdAt: sampleDate,
          updatedAt: sampleDate,
          questions: [
            {
              id: 'q-1',
              examId: 'exam-1',
              type: QuestionType.MULTIPLE_CHOICE_SINGLE,
              content: 'Prompt',
              position: 0,
              contextId: null,
              options: [
                { id: 'opt-1', content: 'A', position: 0, isCorrect: true },
                { id: 'opt-2', content: 'B', position: 1, isCorrect: false },
              ],
            },
          ],
          bestResults: [],
        }),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'exam-1' }),
        update: vi.fn().mockResolvedValue({ id: 'exam-1' }),
        count: vi.fn().mockResolvedValue(0),
        findUniqueOrThrow: vi.fn(),
      },
      examQuestion: {
        create: vi.fn().mockResolvedValue({ id: 'q-1' }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      examOption: {
        createMany: vi.fn().mockResolvedValue({ count: 4 }),
      },
      examFolder: {
        findFirst: vi.fn().mockResolvedValue({ id: 'folder-1' }),
      },
      $transaction: vi.fn().mockImplementation((cb: (tx: unknown) => unknown) => cb(prismaMock)),
    };

    service = new ExamsService(prismaMock as unknown as PrismaService);
  });

  describe('validateQuestions', () => {
    it('passes for 2 to 6 options with exactly 1 correct answer', () => {
      expect(() => service.validateQuestions(validQuestions)).not.toThrow();
    });

    it('rejects question with only 1 option (< 2)', () => {
      const invalid = [
        {
          type: QuestionType.MULTIPLE_CHOICE_SINGLE,
          content: 'Prompt',
          position: 0,
          options: [{ content: 'Only one', isCorrect: true, position: 0 }],
        },
      ];
      expect(() => service.validateQuestions(invalid)).toThrow(BadRequestException);
    });

    it('rejects question with 7 options (> 6)', () => {
      const invalid = [
        {
          type: QuestionType.MULTIPLE_CHOICE_SINGLE,
          content: 'Prompt',
          position: 0,
          options: [
            { content: '1', isCorrect: true, position: 0 },
            { content: '2', isCorrect: false, position: 1 },
            { content: '3', isCorrect: false, position: 2 },
            { content: '4', isCorrect: false, position: 3 },
            { content: '5', isCorrect: false, position: 4 },
            { content: '6', isCorrect: false, position: 5 },
            { content: '7', isCorrect: false, position: 6 },
          ],
        },
      ];
      expect(() => service.validateQuestions(invalid)).toThrow(BadRequestException);
    });

    it('rejects question with 0 correct options', () => {
      const invalid = [
        {
          type: QuestionType.MULTIPLE_CHOICE_SINGLE,
          content: 'Prompt',
          position: 0,
          options: [
            { content: '1', isCorrect: false, position: 0 },
            { content: '2', isCorrect: false, position: 1 },
          ],
        },
      ];
      expect(() => service.validateQuestions(invalid)).toThrow(BadRequestException);
    });

    it('rejects question with 2 correct options', () => {
      const invalid = [
        {
          type: QuestionType.MULTIPLE_CHOICE_SINGLE,
          content: 'Prompt',
          position: 0,
          options: [
            { content: '1', isCorrect: true, position: 0 },
            { content: '2', isCorrect: true, position: 1 },
          ],
        },
      ];
      expect(() => service.validateQuestions(invalid)).toThrow(BadRequestException);
    });
  });

  describe('createExam', () => {
    it('creates exam with initial questions transactionally', async () => {
      const exam = await service.createExam({
        title: 'JLPT N3 Grammar Mock',
        timeLimitSeconds: 1800,
        questions: validQuestions,
      });

      expect(exam.id).toBe('exam-1');
      expect(prismaMock.exam.create).toHaveBeenCalled();
      expect(prismaMock.examQuestion.create).toHaveBeenCalled();
      expect(prismaMock.examOption.createMany).toHaveBeenCalled();
    });
  });

  describe('updateExamMetadata', () => {
    it('updates metadata without incrementing contentVersion', async () => {
      await service.updateExamMetadata('exam-1', {
        title: 'New Title',
        shuffleQuestions: true,
      });

      expect(prismaMock.exam.update).toHaveBeenCalledWith({
        where: { id: 'exam-1' },
        data: expect.objectContaining({
          title: 'New Title',
          shuffleQuestions: true,
        }),
      });
      expect(prismaMock.exam.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ contentVersion: expect.anything() }),
        }),
      );
    });
  });

  describe('updateExamContent', () => {
    it('updates questions and atomically increments contentVersion', async () => {
      await service.updateExamContent('exam-1', {
        questions: validQuestions,
      });

      expect(prismaMock.exam.update).toHaveBeenCalledWith({
        where: { id: 'exam-1' },
        data: expect.objectContaining({
          contentVersion: { increment: 1 },
        }),
      });
      expect(prismaMock.examQuestion.deleteMany).toHaveBeenCalledWith({
        where: { examId: 'exam-1' },
      });
      expect(prismaMock.examQuestion.create).toHaveBeenCalled();
    });
  });
});
