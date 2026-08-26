import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const now = new Date('2026-08-26T00:00:00.000Z');
const cardId = 'c1111111-1111-1111-1111-111111111111';

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    id: cardId,
    setId: '11111111-1111-1111-1111-111111111111',
    front: '日',
    back: 'Sun',
    position: 0,
    createdAt: now,
    updatedAt: now,
    fsrsState: 'NEW',
    fsrsDueAt: now,
    fsrsStability: null,
    fsrsDifficulty: null,
    fsrsElapsedDays: 0,
    fsrsScheduledDays: 0,
    fsrsLearningSteps: 0,
    fsrsReps: 0,
    fsrsLapses: 0,
    fsrsLastReviewedAt: null,
    ...overrides,
  };
}

function makeLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'l1111111-1111-1111-1111-111111111111',
    flashcardId: cardId,
    clientRequestId: 'request-1',
    rating: 'GOOD',
    stateBefore: 'NEW',
    stateAfter: 'LEARNING',
    reviewedAt: new Date('2026-08-26T00:00:00.000Z'),
    dueAtBefore: now,
    dueAtAfter: new Date('2026-08-26T00:10:00.000Z'),
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 1,
    lapses: 0,
    stability: 2.3065,
    difficulty: 2.11810397,
    createdAt: now,
    ...overrides,
  };
}

describe('ReviewService', () => {
  let service: ReviewService;
  let tx: {
    flashcard: {
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    flashcardReviewLog: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let prismaMock: {
    flashcard: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    flashcardReviewLog: { findUnique: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    tx = {
      flashcard: {
        findFirst: vi.fn().mockResolvedValue(makeCard()),
        update: vi
          .fn()
          .mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
            makeCard(data),
          ),
      },
      flashcardReviewLog: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi
          .fn()
          .mockImplementation(async ({ data }: { data: Record<string, unknown> }) => makeLog(data)),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    prismaMock = {
      flashcard: {
        count: vi.fn(),
        findMany: vi.fn().mockResolvedValue([makeCard()]),
      },
      flashcardReviewLog: { findUnique: vi.fn() },
      $transaction: vi
        .fn()
        .mockImplementation((callback: (client: unknown) => unknown) => callback(tx)),
    };
    service = new ReviewService(prismaMock as unknown as PrismaService);
  });

  it('returns bounded server-time due/new/review counts', async () => {
    prismaMock.flashcard.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    await expect(service.getSummary(now)).resolves.toEqual({
      serverNow: now.toISOString(),
      dueCount: 3,
      newCount: 2,
      reviewCount: 1,
    });
    expect(prismaMock.flashcard.count).toHaveBeenNthCalledWith(1, {
      where: { deletedAt: null, fsrsDueAt: { lte: now } },
    });
  });

  it('returns at most 20 due active cards in deterministic order', async () => {
    const result = await service.getQueue(999, now);

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].schedule.state).toBe('NEW');
    expect(prismaMock.flashcard.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, fsrsDueAt: { lte: now } },
      orderBy: [{ fsrsDueAt: 'asc' }, { position: 'asc' }, { id: 'asc' }],
      take: 20,
      select: expect.any(Object),
    });
  });

  it('schedules a new card transactionally with a review log', async () => {
    const result = await service.submitReview(
      cardId,
      { rating: 'GOOD', clientRequestId: 'request-1' },
      now,
    );

    expect(result.cardId).toBe(cardId);
    expect(result.stateBefore).toBe('NEW');
    expect(result.stateAfter).toBe('LEARNING');
    expect(result.dueAtAfter).toBe('2026-08-26T00:10:00.000Z');
    expect(tx.flashcard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: cardId },
        data: expect.objectContaining({
          fsrsState: 'LEARNING',
          fsrsReps: 1,
          fsrsLastReviewedAt: now,
        }),
      }),
    );
    expect(tx.flashcardReviewLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          flashcardId: cardId,
          clientRequestId: 'request-1',
          rating: 'GOOD',
        }),
      }),
    );
    expect(tx.flashcardReviewLog.deleteMany).toHaveBeenCalled();
  });

  it('prunes review logs by age and per-card count after a successful review', async () => {
    tx.flashcardReviewLog.findMany.mockResolvedValue([{ id: 'overflow-log' }]);

    await service.submitReview(cardId, { rating: 'GOOD', clientRequestId: 'request-3' }, now);

    expect(tx.flashcardReviewLog.deleteMany).toHaveBeenNthCalledWith(1, {
      where: { reviewedAt: { lt: expect.any(Date) } },
    });
    expect(tx.flashcardReviewLog.deleteMany).toHaveBeenNthCalledWith(2, {
      where: { id: { in: ['overflow-log'] } },
    });
  });

  it('replays a duplicate request without updating the card twice', async () => {
    const existing = makeLog();
    tx.flashcardReviewLog.findUnique.mockResolvedValue(existing);

    const result = await service.submitReview(
      cardId,
      { rating: 'EASY', clientRequestId: 'request-1' },
      new Date('2026-08-27T00:00:00.000Z'),
    );

    expect(result.rating).toBe('GOOD');
    expect(result.dueAtAfter).toBe(existing.dueAtAfter.toISOString());
    expect(tx.flashcard.update).not.toHaveBeenCalled();
    expect(tx.flashcardReviewLog.create).not.toHaveBeenCalled();
  });

  it('rejects a deleted or missing card and excludes deleted cards from the queue', async () => {
    tx.flashcard.findFirst.mockResolvedValue(null);

    await expect(
      service.submitReview(cardId, { rating: 'AGAIN', clientRequestId: 'request-2' }, now),
    ).rejects.toThrow(NotFoundException);
    expect(prismaMock.flashcard.findMany).not.toHaveBeenCalled();
  });
});
