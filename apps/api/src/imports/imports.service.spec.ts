import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DuplicatePolicy, ImportType } from '@japanese-learning/contracts';
import { ImportsService } from './imports.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ImportsService - Flashcards (TASK-033 / IMP-001..010)', () => {
  let service: ImportsService;
  let prismaMock: {
    importSession: {
      create: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    flashcardSet: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
    };
    flashcard: {
      createMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const sampleDate = new Date('2026-08-26T00:00:00.000Z');
  const validMd = `# N5 Kanji\n\n## Card 1\n### Front\n日\n### Back\nSun`;

  beforeEach(() => {
    prismaMock = {
      importSession: {
        create: vi.fn().mockResolvedValue({
          id: 'session-uuid-1234',
          type: ImportType.FLASHCARD_SET,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          consumedAt: null,
        }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'session-uuid-1234',
          type: ImportType.FLASHCARD_SET,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          consumedAt: null,
          normalizedPayload: {
            title: 'N5 Kanji',
            description: null,
            cards: [{ front: '日', back: 'Sun', position: 0 }],
          },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      flashcardSet: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 'new-set-id',
          title: 'N5 Kanji',
          description: null,
          coverRef: null,
          createdAt: sampleDate,
          updatedAt: sampleDate,
        }),
        update: vi.fn().mockResolvedValue({}),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'new-set-id',
          title: 'N5 Kanji',
          description: null,
          coverRef: null,
          createdAt: sampleDate,
          updatedAt: sampleDate,
          _count: { cards: 1 },
        }),
      },
      flashcard: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: vi.fn().mockImplementation((callback: (tx: unknown) => unknown) => {
        return callback({
          flashcardSet: prismaMock.flashcardSet,
          flashcard: prismaMock.flashcard,
          importSession: prismaMock.importSession,
        });
      }),
    };

    service = new ImportsService(prismaMock as unknown as PrismaService);
  });

  describe('previewFlashcards', () => {
    it('creates import session and returns preview without creating sets or cards', async () => {
      const result = await service.previewFlashcards(validMd);

      expect(result).toBeDefined();
      expect(result.importToken).toBe('session-uuid-1234');
      expect(result.preview.title).toBe('N5 Kanji');
      expect(result.preview.cardCount).toBe(1);
      expect(result.preview.errors).toHaveLength(0);

      expect(prismaMock.importSession.create).toHaveBeenCalled();
      expect(prismaMock.flashcardSet.create).not.toHaveBeenCalled();
      expect(prismaMock.flashcard.createMany).not.toHaveBeenCalled();
    });

    it('rejects empty content with BadRequestException', async () => {
      await expect(service.previewFlashcards('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmFlashcards', () => {
    it('commits flashcards import session transactionally', async () => {
      const result = await service.confirmFlashcards({
        importToken: 'session-uuid-1234',
        duplicatePolicy: DuplicatePolicy.RENAME,
      });

      expect(result.id).toBe('new-set-id');
      expect(result.title).toBe('N5 Kanji');
      expect(result.cardCount).toBe(1);
      expect(prismaMock.importSession.update).toHaveBeenCalled();
    });

    it('rejects duplicate title when policy is REJECT', async () => {
      prismaMock.flashcardSet.findFirst.mockResolvedValueOnce({
        id: 'existing-id',
        title: 'N5 Kanji',
      });

      await expect(
        service.confirmFlashcards({
          importToken: 'session-uuid-1234',
          duplicatePolicy: DuplicatePolicy.REJECT,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for non-existent session', async () => {
      prismaMock.importSession.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.confirmFlashcards({
          importToken: 'invalid-token',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for already consumed session', async () => {
      prismaMock.importSession.findFirst.mockResolvedValueOnce({
        id: 'session-uuid-1234',
        consumedAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(
        service.confirmFlashcards({
          importToken: 'session-uuid-1234',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired session', async () => {
      prismaMock.importSession.findFirst.mockResolvedValueOnce({
        id: 'session-uuid-1234',
        consumedAt: null,
        expiresAt: new Date(Date.now() - 1000), // in the past
      });

      await expect(
        service.confirmFlashcards({
          importToken: 'session-uuid-1234',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
