import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  LearningService,
  MAX_RECENT_RESPONSE_ITEMS,
  MAX_RECENT_STORAGE_ITEMS,
  PRIMARY_USER_KEY,
} from './learning.service.js';

describe('LearningService (TASK-240)', () => {
  it('upserts access and removes rows beyond the storage bound', async () => {
    const prismaMock = {
      recentLearning: {
        upsert: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([{ id: 'old-1' }, { id: 'old-2' }]),
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      flashcardSet: { findMany: vi.fn() },
      exam: { findMany: vi.fn() },
    };
    const service = new LearningService(prismaMock as unknown as PrismaService);
    const accessedAt = new Date('2026-08-26T00:00:00.000Z');

    await service.touchFlashcardSet('set-1', accessedAt);

    expect(prismaMock.recentLearning.upsert).toHaveBeenCalledWith({
      where: {
        userKey_kind_entityId: {
          userKey: PRIMARY_USER_KEY,
          kind: 'FLASHCARD_SET',
          entityId: 'set-1',
        },
      },
      create: {
        userKey: PRIMARY_USER_KEY,
        kind: 'FLASHCARD_SET',
        entityId: 'set-1',
        lastAccessedAt: accessedAt,
      },
      update: { lastAccessedAt: accessedAt },
    });
    expect(prismaMock.recentLearning.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userKey: PRIMARY_USER_KEY },
        skip: MAX_RECENT_STORAGE_ITEMS,
        take: MAX_RECENT_STORAGE_ITEMS,
      }),
    );
    expect(prismaMock.recentLearning.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['old-1', 'old-2'] } },
    });
  });

  it('returns a bounded ordered list and filters deleted or invalid content', async () => {
    const firstAccess = new Date('2026-08-26T00:00:00.000Z');
    const secondAccess = new Date('2026-08-25T00:00:00.000Z');
    const prismaMock = {
      recentLearning: {
        upsert: vi.fn(),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'recent-set',
            kind: 'FLASHCARD_SET',
            entityId: 'set-1',
            lastAccessedAt: firstAccess,
          },
          {
            id: 'deleted-exam',
            kind: 'EXAM',
            entityId: 'exam-deleted',
            lastAccessedAt: new Date('2026-08-25T23:00:00.000Z'),
          },
          {
            id: 'recent-exam',
            kind: 'EXAM',
            entityId: 'exam-1',
            lastAccessedAt: secondAccess,
          },
          {
            id: 'missing-set',
            kind: 'FLASHCARD_SET',
            entityId: 'set-missing',
            lastAccessedAt: new Date('2026-08-24T00:00:00.000Z'),
          },
        ]),
        deleteMany: vi.fn(),
      },
      flashcardSet: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'set-1',
            title: 'N5 Kanji',
            description: 'Basics',
            _count: { cards: 12 },
          },
        ]),
      },
      exam: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'exam-1',
            title: 'N5 Practice',
            description: 'Practice',
            _count: { questions: 8 },
          },
        ]),
      },
    };
    const service = new LearningService(prismaMock as unknown as PrismaService);

    const result = await service.listRecent(MAX_RECENT_RESPONSE_ITEMS);

    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.entityId)).toEqual(['set-1', 'exam-1']);
    expect(result.items[0]).toMatchObject({
      kind: 'FLASHCARD_SET',
      cardCount: 12,
      href: '/flashcards/set-1/study',
    });
    expect(result.items[1]).toMatchObject({
      kind: 'EXAM',
      questionCount: 8,
      href: '/exams/exam-1/take',
    });
    expect(prismaMock.recentLearning.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: MAX_RECENT_STORAGE_ITEMS }),
    );
  });
});
