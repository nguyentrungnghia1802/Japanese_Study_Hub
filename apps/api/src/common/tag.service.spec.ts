import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  MAX_TAG_COUNT,
  MAX_TAGS_PER_ENTITY,
  TagService,
  normalizeTagName,
  normalizeTagNames,
} from './tag.service.js';

describe('TagService (TASK-242)', () => {
  const tag = { id: 'tag-1', slug: 'grammar', name: 'Grammar' };
  let service: TagService;
  let prismaMock: {
    tag: Record<string, ReturnType<typeof vi.fn>>;
    flashcardSet: Record<string, ReturnType<typeof vi.fn>>;
    exam: Record<string, ReturnType<typeof vi.fn>>;
    flashcardSetTag: Record<string, ReturnType<typeof vi.fn>>;
    examTag: Record<string, ReturnType<typeof vi.fn>>;
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    prismaMock = {
      tag: {
        findMany: vi.fn().mockResolvedValue([tag]),
        findUnique: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        upsert: vi.fn().mockResolvedValue(tag),
        update: vi.fn().mockResolvedValue(tag),
        delete: vi.fn().mockResolvedValue(tag),
      },
      flashcardSet: { findFirst: vi.fn().mockResolvedValue({ id: 'set-1' }) },
      exam: { findFirst: vi.fn().mockResolvedValue({ id: 'exam-1' }) },
      flashcardSetTag: { deleteMany: vi.fn(), createMany: vi.fn() },
      examTag: { deleteMany: vi.fn(), createMany: vi.fn() },
      $transaction: vi
        .fn()
        .mockImplementation((callback: (tx: unknown) => unknown) => callback(prismaMock)),
    };
    service = new TagService(prismaMock as unknown as PrismaService);
  });

  it('normalizes Unicode, whitespace, and slug casing deterministically', () => {
    expect(normalizeTagName('  Ｎ５\u3000  Grammar  ')).toEqual({
      name: 'N5 Grammar',
      slug: 'n5 grammar',
    });
  });

  it('deduplicates assignments by normalized slug and bounds entity assignments', () => {
    expect(normalizeTagNames([' Grammar ', 'grammar', '日本語'])).toEqual([
      { name: 'grammar', slug: 'grammar' },
      { name: '日本語', slug: '日本語' },
    ]);
    expect(() =>
      normalizeTagNames(Array.from({ length: MAX_TAGS_PER_ENTITY + 1 }, (_, i) => `t${i}`)),
    ).toThrow(BadRequestException);
  });

  it('lists tags with a bounded limit', async () => {
    await service.listTags(999);
    expect(prismaMock.tag.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });

  it('creates an idempotent normalized tag and enforces the global bound', async () => {
    await service.createTag('  Grammar  ');
    expect(prismaMock.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'grammar' },
        create: { name: 'Grammar', slug: 'grammar' },
      }),
    );

    prismaMock.tag.count.mockResolvedValueOnce(MAX_TAG_COUNT);
    await expect(service.createTag('new tag')).rejects.toThrow(BadRequestException);
  });

  it('renames and deletes tags while preserving conflict/not-found behavior', async () => {
    prismaMock.tag.findUnique.mockResolvedValueOnce(tag).mockResolvedValueOnce(null);
    await service.renameTag('grammar', '  Syntax  ');
    expect(prismaMock.tag.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'Syntax', slug: 'syntax' } }),
    );

    prismaMock.tag.findUnique.mockResolvedValueOnce(tag).mockResolvedValueOnce({ id: 'tag-2' });
    await expect(service.renameTag('grammar', 'Syntax')).rejects.toThrow(ConflictException);

    prismaMock.tag.findUnique.mockResolvedValueOnce(null);
    await expect(service.deleteTag('missing')).rejects.toThrow(NotFoundException);
    prismaMock.tag.findUnique.mockResolvedValueOnce(tag);
    await expect(service.deleteTag('grammar')).resolves.toEqual({ success: true, slug: 'grammar' });
    expect(prismaMock.tag.delete).toHaveBeenCalledWith({ where: { id: tag.id } });
  });

  it('replaces active flashcard-set tags transactionally', async () => {
    prismaMock.tag.findMany.mockResolvedValueOnce([]);
    prismaMock.tag.upsert
      .mockResolvedValueOnce({ id: 'tag-1', slug: 'grammar', name: 'Grammar' })
      .mockResolvedValueOnce({ id: 'tag-2', slug: 'jlpt', name: 'JLPT' });

    await expect(service.replaceFlashcardSetTags('set-1', ['Grammar', 'JLPT'])).resolves.toEqual([
      { id: 'tag-1', slug: 'grammar', name: 'Grammar' },
      { id: 'tag-2', slug: 'jlpt', name: 'JLPT' },
    ]);
    expect(prismaMock.flashcardSetTag.deleteMany).toHaveBeenCalledWith({
      where: { setId: 'set-1' },
    });
    expect(prismaMock.flashcardSetTag.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          { setId: 'set-1', tagId: 'tag-1' },
          { setId: 'set-1', tagId: 'tag-2' },
        ],
      }),
    );
  });

  it('does not assign tags to deleted entities', async () => {
    prismaMock.flashcardSet.findFirst.mockResolvedValueOnce(null);
    await expect(service.replaceFlashcardSetTags('deleted', [])).rejects.toThrow(NotFoundException);
  });
});
