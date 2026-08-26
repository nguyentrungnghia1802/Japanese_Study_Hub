import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FlashcardsService } from './flashcards.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('FlashcardsService (TASK-030 / FC-001..008)', () => {
  let service: FlashcardsService;
  let prismaMock: {
    flashcardSet: {
      create: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    flashcard: {
      create: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const sampleDate = new Date('2026-08-26T00:00:00.000Z');
  const sampleSet = {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'JLPT N5 Kanji',
    description: 'Basic N5 kanji set',
    coverRef: null,
    isFavorite: false,
    createdAt: sampleDate,
    updatedAt: sampleDate,
    deletedAt: null,
    _count: { cards: 2 },
    cards: [
      {
        id: 'c1111111-1111-1111-1111-111111111111',
        setId: '11111111-1111-1111-1111-111111111111',
        front: '日',
        back: 'Sun, Day',
        position: 0,
        createdAt: sampleDate,
        updatedAt: sampleDate,
        deletedAt: null,
      },
      {
        id: 'c2222222-2222-2222-2222-222222222222',
        setId: '11111111-1111-1111-1111-111111111111',
        front: '本',
        back: 'Book, Origin',
        position: 1,
        createdAt: sampleDate,
        updatedAt: sampleDate,
        deletedAt: null,
      },
    ],
  };

  beforeEach(() => {
    prismaMock = {
      flashcardSet: {
        create: vi.fn().mockResolvedValue(sampleSet),
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([sampleSet]),
        findFirst: vi.fn().mockResolvedValue(sampleSet),
        update: vi.fn().mockResolvedValue(sampleSet),
      },
      flashcard: {
        create: vi.fn().mockResolvedValue(sampleSet.cards[0]),
        findFirst: vi.fn().mockResolvedValue(sampleSet.cards[0]),
        findMany: vi.fn().mockResolvedValue(sampleSet.cards),
        update: vi.fn().mockResolvedValue(sampleSet.cards[0]),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      $transaction: vi.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    service = new FlashcardsService(prismaMock as unknown as PrismaService);
  });

  describe('Sets CRUD', () => {
    it('creates a new flashcard set', async () => {
      const result = await service.createSet({
        title: 'JLPT N5 Kanji',
        description: 'Basic N5 kanji set',
      });

      expect(result.id).toBe(sampleSet.id);
      expect(result.title).toBe(sampleSet.title);
      expect(result.cardCount).toBe(2);
      expect(prismaMock.flashcardSet.create).toHaveBeenCalled();
    });

    it('lists flashcard sets with pagination', async () => {
      const result = await service.listSets({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.items[0]).not.toHaveProperty('cards');
    });

    it('filters flashcard sets by favorite state', async () => {
      await service.listSets({ favorite: true });

      expect(prismaMock.flashcardSet.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isFavorite: true }) }),
      );
      expect(prismaMock.flashcardSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isFavorite: true }) }),
      );
    });

    it('gets a single set with cards', async () => {
      const result = await service.getSet(sampleSet.id);
      expect(result.id).toBe(sampleSet.id);
      expect(result.cards).toHaveLength(2);
      expect(result.cards[0].front).toBe('日');
    });

    it('throws NotFoundException when set does not exist', async () => {
      prismaMock.flashcardSet.findFirst.mockResolvedValueOnce(null);
      await expect(service.getSet('unknown-id')).rejects.toThrow(NotFoundException);
    });

    it('exports a set to canonical Markdown', async () => {
      const exported = await service.exportSetToMarkdown(sampleSet.id);
      expect(exported.filename).toBe('JLPT_N5_Kanji.md');
      expect(exported.content).toContain('# JLPT N5 Kanji');
      expect(exported.content).toContain('### Front\n\n日');
      expect(exported.content).toContain('### Back\n\nSun, Day');
    });

    it('soft deletes set and associated cards', async () => {
      const result = await service.deleteSet(sampleSet.id);
      expect(result.success).toBe(true);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('sets favorite idempotently after verifying the set is active', async () => {
      prismaMock.flashcardSet.findFirst
        .mockResolvedValueOnce(sampleSet)
        .mockResolvedValueOnce({ ...sampleSet, isFavorite: true });

      const result = await service.setFavorite(sampleSet.id, true);

      expect(result.isFavorite).toBe(true);
      expect(prismaMock.flashcardSet.update).toHaveBeenCalledWith({
        where: { id: sampleSet.id },
        data: { isFavorite: true },
      });
    });
  });

  describe('Cards CRUD', () => {
    it('creates a card in a set with calculated next position', async () => {
      prismaMock.flashcard.findFirst.mockResolvedValueOnce({ position: 1 });
      const card = await service.createCard(sampleSet.id, {
        front: '月',
        back: 'Moon, Month',
      });

      expect(card.front).toBe('日');
      expect(prismaMock.flashcard.create).toHaveBeenCalled();
    });

    it('updates a card', async () => {
      const updatedCard = await service.updateCard(sampleSet.id, sampleSet.cards[0].id, {
        front: '日 (Updated)',
      });

      expect(updatedCard).toBeDefined();
      expect(prismaMock.flashcard.update).toHaveBeenCalled();
    });

    it('reorders cards in a set', async () => {
      const cardIds = [sampleSet.cards[1].id, sampleSet.cards[0].id];
      const reordered = await service.reorderCards(sampleSet.id, { cardIds });

      expect(reordered.id).toBe(sampleSet.id);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('duplicates a set transactionally with all cards', async () => {
      const txMock = {
        flashcardSet: {
          create: vi.fn().mockResolvedValue({
            id: 'new-set-id',
            title: 'JLPT N5 Kanji (Copy)',
            description: sampleSet.description,
            coverRef: sampleSet.coverRef,
            isFavorite: false,
            createdAt: sampleDate,
            updatedAt: sampleDate,
          }),
        },
        flashcard: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };

      prismaMock.$transaction.mockImplementationOnce(async (callback: (tx: unknown) => unknown) => {
        return callback(txMock);
      });

      const copy = await service.duplicateSet(sampleSet.id);
      expect(copy.id).toBe('new-set-id');
      expect(copy.title).toBe('JLPT N5 Kanji (Copy)');
      expect(copy.cardCount).toBe(2);
    });

    it('duplicates a card with incremented position', async () => {
      prismaMock.flashcard.findFirst
        .mockResolvedValueOnce(sampleSet.cards[0])
        .mockResolvedValueOnce({ position: 5 });

      prismaMock.flashcard.create.mockResolvedValueOnce({
        ...sampleSet.cards[0],
        id: 'new-card-id',
        front: '日 (Copy)',
        position: 6,
      });

      const duplicated = await service.duplicateCard(sampleSet.id, sampleSet.cards[0].id);

      expect(duplicated.id).toBe('new-card-id');
      expect(duplicated.front).toBe('日 (Copy)');
      expect(duplicated.position).toBe(6);
    });
  });
});
