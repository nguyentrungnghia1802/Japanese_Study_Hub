import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchService } from './search.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('SearchService (TASK-090 / SEARCH-001..006)', () => {
  let service: SearchService;
  let prismaMock: {
    flashcardSet: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    flashcard: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    exam: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    examFolder: {
      findMany: ReturnType<typeof vi.fn>;
    };
    examBestResult: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  const sampleDate = new Date('2026-08-26T00:00:00.000Z');

  beforeEach(() => {
    prismaMock = {
      flashcardSet: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'set-1',
            title: 'N5 Kanji Basics',
            description: 'Beginner Kanji',
            coverRef: null,
            createdAt: sampleDate,
            updatedAt: sampleDate,
            _count: { cards: 10 },
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
      },
      flashcard: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'card-1',
            setId: 'set-1',
            front: '食べる',
            back: 'To eat',
            position: 0,
            createdAt: sampleDate,
            updatedAt: sampleDate,
            set: { title: 'N5 Kanji Basics' },
          },
        ]),
        count: vi.fn().mockResolvedValue(10),
      },
      exam: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'exam-1',
            folderId: null,
            title: 'JLPT N5 Mock Exam',
            description: 'Full mock',
            coverRef: null,
            timeLimitSeconds: 1800,
            contentVersion: 1,
            shuffleQuestions: false,
            shuffleOptions: false,
            createdAt: sampleDate,
            updatedAt: sampleDate,
            _count: { questions: 20 },
            bestResults: [{ bestScore: 90 }],
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
      },
      examFolder: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'folder-1',
            parentId: null,
            name: 'N5 Materials',
            position: 0,
            createdAt: sampleDate,
            updatedAt: sampleDate,
            _count: { exams: 1 },
          },
        ]),
      },
      examBestResult: {
        findMany: vi.fn().mockResolvedValue([
          {
            examId: 'exam-1',
            bestScore: 90,
            achievedAt: sampleDate,
            exam: { title: 'JLPT N5 Mock Exam' },
          },
        ]),
      },
    };

    service = new SearchService(prismaMock as unknown as PrismaService);
  });

  describe('search', () => {
    it('returns empty result when query is empty', async () => {
      const results = await service.search('');
      expect(results.total).toBe(0);
      expect(results.flashcardSets).toHaveLength(0);
      expect(results.flashcards).toHaveLength(0);
      expect(results.exams).toHaveLength(0);
      expect(results.folders).toHaveLength(0);
    });

    it('searches across all domains with Japanese query and excludes soft-deleted items', async () => {
      const results = await service.search('食べる');

      expect(results.total).toBe(4);
      expect(results.flashcardSets).toHaveLength(1);
      expect(results.flashcards).toHaveLength(1);
      expect(results.exams).toHaveLength(1);
      expect(results.folders).toHaveLength(1);

      expect(prismaMock.flashcardSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
      expect(prismaMock.flashcard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
      expect(prismaMock.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });
  });

  describe('getDashboardSummary', () => {
    it('returns aggregated metrics and recent items', async () => {
      const summary = await service.getDashboardSummary();

      expect(summary.totalFlashcardSets).toBe(1);
      expect(summary.totalCards).toBe(10);
      expect(summary.totalExams).toBe(1);
      expect(summary.recentFlashcardSets).toHaveLength(1);
      expect(summary.recentExams).toHaveLength(1);
      expect(summary.recentBestScores).toHaveLength(1);
      expect(summary.recentBestScores[0].bestScore).toBe(90);
    });
  });
});
