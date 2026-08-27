import { describe, expect, it, vi } from 'vitest';
import { DictionaryLookupDirection } from '@japanese-learning/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  DictionaryFavoritesService,
  MAX_DICTIONARY_FAVORITE_PAGE_SIZE,
  normalizeFavoritePage,
} from './dictionary-favorites.service.js';
import { DictionaryDomainError } from './dictionary-domain-error.js';

const source = {
  provider: 'MINHQND' as const,
  name: 'MinhQND Vietnamese Dictionary',
  url: 'https://dict.minhqnd.com/',
  license: 'CC BY-SA 4.0',
  attribution: 'MinhQND / dict.minhqnd.com',
};

function createService() {
  const dictionaryFavorite = {
    upsert: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  };
  const prisma = { dictionaryFavorite } as unknown as PrismaService;
  return {
    service: new DictionaryFavoritesService(prisma),
    dictionaryFavorite,
  };
}

describe('DictionaryFavoritesService (TASK-421)', () => {
  it('stores only flattened metadata and updates an existing favorite idempotently', async () => {
    const { service, dictionaryFavorite } = createService();
    dictionaryFavorite.upsert.mockResolvedValue({
      id: 'favorite-1',
      term: '日本語',
      reading: 'にほんご',
      meaningSummary: 'ngôn ngữ Nhật Bản',
      direction: 'JA_TO_VI',
      sourceProvider: 'MINHQND',
      sourceName: source.name,
      sourceUrl: source.url,
      sourceLicense: source.license,
      sourceAttribution: source.attribution,
      createdAt: new Date('2026-08-27T00:00:00.000Z'),
      updatedAt: new Date('2026-08-27T00:00:01.000Z'),
    });

    await expect(
      service.save({
        term: '  日本語 ',
        reading: 'にほんご',
        meaningSummary: '<b>ngôn ngữ Nhật Bản</b>',
        direction: DictionaryLookupDirection.JA_TO_VI,
        source,
      }),
    ).resolves.toMatchObject({
      id: 'favorite-1',
      term: '日本語',
      meaningSummary: 'ngôn ngữ Nhật Bản',
      reading: 'にほんご',
      source,
    });

    expect(dictionaryFavorite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userKey_term_direction_reading: {
            userKey: 'primary_user',
            term: '日本語',
            direction: 'JA_TO_VI',
            reading: 'にほんご',
          },
        },
        update: expect.objectContaining({ meaningSummary: 'ngôn ngữ Nhật Bản' }),
      }),
    );
  });

  it('returns a bounded user-scoped page with no raw payload field', async () => {
    const { service, dictionaryFavorite } = createService();
    dictionaryFavorite.findMany.mockResolvedValue([
      {
        id: 'favorite-1',
        term: '本',
        reading: 'ほん',
        meaningSummary: 'sách',
        direction: 'JA_TO_VI',
        sourceProvider: 'MINHQND',
        sourceName: source.name,
        sourceUrl: source.url,
        sourceLicense: source.license,
        sourceAttribution: source.attribution,
        createdAt: new Date('2026-08-27T00:00:00.000Z'),
        updatedAt: new Date('2026-08-27T00:00:00.000Z'),
      },
    ]);
    dictionaryFavorite.count.mockResolvedValue(3);

    const result = await service.list(999, 14);
    expect(result).toMatchObject({
      total: 3,
      limit: MAX_DICTIONARY_FAVORITE_PAGE_SIZE,
      offset: 14,
    });
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        term: '本',
        reading: 'ほん',
        meaningSummary: 'sách',
        source,
      }),
    );
    expect(result.items[0]).not.toHaveProperty('raw');
    expect(dictionaryFavorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 14, take: MAX_DICTIONARY_FAVORITE_PAGE_SIZE }),
    );
  });

  it('deletes only a favorite belonging to the logical primary user', async () => {
    const { service, dictionaryFavorite } = createService();
    dictionaryFavorite.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.remove('favorite-1')).resolves.toEqual({
      success: true,
      id: 'favorite-1',
    });
    expect(dictionaryFavorite.deleteMany).toHaveBeenCalledWith({
      where: { id: 'favorite-1', userKey: 'primary_user' },
    });
  });

  it('rejects invalid source URLs and keeps page bounds deterministic', async () => {
    const { service } = createService();
    await expect(
      service.save({
        term: '日本語',
        reading: null,
        meaningSummary: 'ngôn ngữ Nhật Bản',
        direction: DictionaryLookupDirection.JA_TO_VI,
        source: { ...source, url: 'javascript:alert(1)' },
      }),
    ).rejects.toBeInstanceOf(DictionaryDomainError);
    expect(normalizeFavoritePage(0, -10)).toEqual({ limit: 1, offset: 0 });
  });
});
