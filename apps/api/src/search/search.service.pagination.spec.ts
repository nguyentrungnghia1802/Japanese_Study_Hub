import { describe, expect, it, vi } from 'vitest';
import { SearchService } from './search.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('SearchService bounds', () => {
  it('caps every search domain to the documented maximum', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      flashcardSet: { findMany },
      flashcard: { findMany },
      exam: { findMany },
      examFolder: { findMany },
    } as unknown as PrismaService;

    await new SearchService(prisma).search('日本語', 10_000);

    expect(findMany).toHaveBeenCalledTimes(4);
    for (const call of findMany.mock.calls) expect(call[0].take).toBe(30);
  });
});
