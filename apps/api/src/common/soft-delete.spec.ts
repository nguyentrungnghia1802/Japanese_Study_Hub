import { describe, it, expect, vi } from 'vitest';
import { FlashcardsService } from '../flashcards/flashcards.service.js';
import { ExamsService } from '../exams/exams.service.js';
import { SearchService } from '../search/search.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('Soft Delete & Data Safety Consistency (TASK-100)', () => {
  it('FlashcardsService excludes deletedAt !== null sets and cards', async () => {
    const prismaMock = {
      flashcardSet: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    const service = new FlashcardsService(prismaMock as unknown as PrismaService);
    await service.listSets({ page: 1, limit: 10 });

    expect(prismaMock.flashcardSet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it('ExamsService excludes deletedAt !== null exams', async () => {
    const prismaMock = {
      exam: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    const service = new ExamsService(prismaMock as unknown as PrismaService);
    await service.listExams({ page: 1, limit: 10 });

    expect(prismaMock.exam.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it('SearchService excludes deletedAt !== null records in cross-domain query', async () => {
    const prismaMock = {
      flashcardSet: { findMany: vi.fn().mockResolvedValue([]) },
      flashcard: { findMany: vi.fn().mockResolvedValue([]) },
      exam: { findMany: vi.fn().mockResolvedValue([]) },
      examFolder: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new SearchService(prismaMock as unknown as PrismaService);
    await service.search('kanji');

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
