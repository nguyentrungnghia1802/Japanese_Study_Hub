import { describe, expect, it, vi } from 'vitest';
import { DictionaryErrorCode, DictionaryLookupDirection } from '@japanese-learning/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  DictionaryHistoryService,
  MAX_LOOKUP_HISTORY_ITEMS,
  normalizeHistoryLimit,
  normalizeHistoryQuery,
} from './dictionary-history.service.js';
import { DictionaryDomainError } from './dictionary-domain-error.js';

function createService() {
  const dictionaryLookupHistory = {
    upsert: vi.fn().mockResolvedValue({}),
    findMany: vi.fn().mockResolvedValue([]),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
  };
  const prisma = { dictionaryLookupHistory } as unknown as PrismaService;
  return {
    service: new DictionaryHistoryService(prisma),
    dictionaryLookupHistory,
  };
}

describe('DictionaryHistoryService (TASK-420)', () => {
  it('normalizes and upserts compact metadata, then removes overflow', async () => {
    const { service, dictionaryLookupHistory } = createService();
    dictionaryLookupHistory.findMany.mockResolvedValue([{ id: 'old-1' }, { id: 'old-2' }]);
    const now = new Date('2026-08-27T00:00:00.000Z');

    await service.record({
      query: '  日本語\n',
      direction: DictionaryLookupDirection.JA_TO_VI,
      primaryLabel: ' 日本語 ',
      now,
    });

    expect(dictionaryLookupHistory.upsert).toHaveBeenCalledWith({
      where: {
        userKey_query_direction: {
          userKey: 'primary_user',
          query: '日本語',
          direction: DictionaryLookupDirection.JA_TO_VI,
        },
      },
      create: {
        userKey: 'primary_user',
        query: '日本語',
        direction: DictionaryLookupDirection.JA_TO_VI,
        primaryLabel: '日本語',
        createdAt: now,
      },
      update: { primaryLabel: '日本語', createdAt: now },
    });
    expect(dictionaryLookupHistory.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['old-1', 'old-2'] } },
    });
  });

  it('deduplicates the same normalized query and direction through the unique key', async () => {
    const { service, dictionaryLookupHistory } = createService();
    const now = new Date('2026-08-27T00:01:00.000Z');

    await service.record({
      query: '  ｈｏｇａ  ',
      direction: DictionaryLookupDirection.VI_TO_JA,
      now,
    });

    expect(dictionaryLookupHistory.upsert).toHaveBeenCalledTimes(1);
    expect(dictionaryLookupHistory.upsert.mock.calls[0][0].where).toEqual({
      userKey_query_direction: {
        userKey: 'primary_user',
        query: 'hoga',
        direction: DictionaryLookupDirection.VI_TO_JA,
      },
    });
  });

  it('returns only bounded compact rows and caps the reported total', async () => {
    const { service, dictionaryLookupHistory } = createService();
    dictionaryLookupHistory.findMany.mockResolvedValue([
      {
        id: 'history-1',
        query: '日本語',
        direction: 'JA_TO_VI',
        primaryLabel: '日本語',
        createdAt: new Date('2026-08-27T00:00:00.000Z'),
      },
    ]);
    dictionaryLookupHistory.count.mockResolvedValue(MAX_LOOKUP_HISTORY_ITEMS + 7);

    await expect(service.list(999)).resolves.toEqual({
      items: [
        {
          id: 'history-1',
          query: '日本語',
          direction: DictionaryLookupDirection.JA_TO_VI,
          primaryLabel: '日本語',
          createdAt: '2026-08-27T00:00:00.000Z',
        },
      ],
      total: MAX_LOOKUP_HISTORY_ITEMS,
    });
    expect(dictionaryLookupHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: MAX_LOOKUP_HISTORY_ITEMS }),
    );
  });

  it('keeps history at the configured cap after many unique lookups without storing payloads', async () => {
    const { service, dictionaryLookupHistory } = createService();
    const rows: Array<{ id: string; query: string; createdAt: Date }> = [];
    let nextId = 0;

    dictionaryLookupHistory.upsert.mockImplementation(async ({ create }) => {
      nextId += 1;
      rows.unshift({ id: `history-${nextId}`, query: create.query, createdAt: create.createdAt });
      return {};
    });
    dictionaryLookupHistory.findMany.mockImplementation(
      async ({ skip = 0, take = MAX_LOOKUP_HISTORY_ITEMS }: { skip?: number; take?: number }) =>
        rows.slice(skip, skip + take).map(({ id }) => ({ id })),
    );
    dictionaryLookupHistory.deleteMany.mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) => {
        const ids = new Set(where.id.in);
        const before = rows.length;
        for (let index = rows.length - 1; index >= 0; index -= 1) {
          if (ids.has(rows[index].id)) rows.splice(index, 1);
        }
        return { count: before - rows.length };
      },
    );

    for (let index = 0; index < MAX_LOOKUP_HISTORY_ITEMS + 25; index += 1) {
      await service.record({
        query: `lookup-${index}`,
        direction: DictionaryLookupDirection.VI_TO_JA,
        primaryLabel: `Lookup ${index}`,
        now: new Date(1_000 + index),
      });
    }

    expect(rows).toHaveLength(MAX_LOOKUP_HISTORY_ITEMS);
    expect(dictionaryLookupHistory.upsert).toHaveBeenCalledTimes(MAX_LOOKUP_HISTORY_ITEMS + 25);
    for (const call of dictionaryLookupHistory.upsert.mock.calls) {
      expect(call[0].create).not.toHaveProperty('results');
      expect(call[0].create).not.toHaveProperty('meanings');
      expect(call[0].create).not.toHaveProperty('options');
    }
  });

  it('clears only the logical primary user history', async () => {
    const { service, dictionaryLookupHistory } = createService();
    dictionaryLookupHistory.deleteMany.mockResolvedValue({ count: 4 });

    await expect(service.clear()).resolves.toEqual({ deleted: 4 });
    expect(dictionaryLookupHistory.deleteMany).toHaveBeenCalledWith({
      where: { userKey: 'primary_user' },
    });
  });

  it('rejects empty/oversized history queries and bounds list limits', () => {
    expect(() => normalizeHistoryQuery(' \t')).toThrowError(
      expect.objectContaining({ code: DictionaryErrorCode.INVALID_QUERY }),
    );
    expect(() => normalizeHistoryQuery('あ'.repeat(121))).toThrowError(DictionaryDomainError);
    expect(normalizeHistoryLimit(0)).toBe(1);
    expect(normalizeHistoryLimit(999)).toBe(MAX_LOOKUP_HISTORY_ITEMS);
  });
});
