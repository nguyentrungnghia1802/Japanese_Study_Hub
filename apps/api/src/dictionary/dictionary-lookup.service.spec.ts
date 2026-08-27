import { describe, expect, it, vi } from 'vitest';
import { DictionaryErrorCode, DictionaryLookupDirection } from '@japanese-learning/contracts';
import { DictionaryDomainError } from './dictionary-domain-error.js';
import {
  DictionaryLookupCache,
  DictionaryLookupService,
  resolveLookupDirection,
} from './dictionary-lookup.service.js';
import { MinhqndDictionaryProvider } from './minhqnd.provider.js';
import { VietnameseWiktionaryProvider } from './wiktionary.provider.js';
import { MINHQND_SOURCE, VI_WIKTIONARY_SOURCE } from './provider-sources.js';

function word(writtenForm: string, source = MINHQND_SOURCE) {
  return {
    writtenForm,
    reading: null,
    meanings: ['Nghĩa tiếng Việt'],
    partOfSpeech: [],
    common: null,
    frequencyRank: null,
    source,
  };
}

function serviceWith(
  primaryResults: ReturnType<typeof word>[],
  fallbackResults: ReturnType<typeof word>[] = [],
) {
  const primary = {
    lookup: vi.fn().mockResolvedValue(primaryResults),
  } as unknown as MinhqndDictionaryProvider;
  const fallback = {
    lookup: vi.fn().mockResolvedValue(fallbackResults),
  } as unknown as VietnameseWiktionaryProvider;
  const service = new DictionaryLookupService(primary, fallback, new DictionaryLookupCache());
  return { service, primary, fallback };
}

describe('DictionaryLookupService (TASK-411)', () => {
  it('resolves Japanese script to JA_TO_VI and Latin/diacritic input to VI_TO_JA', () => {
    expect(resolveLookupDirection('日本語')).toBe(DictionaryLookupDirection.JA_TO_VI);
    expect(resolveLookupDirection('ありがとう')).toBe(DictionaryLookupDirection.JA_TO_VI);
    expect(resolveLookupDirection('Nhật Bản')).toBe(DictionaryLookupDirection.VI_TO_JA);
  });

  it('honors explicit direction and preserves normalized Unicode query', async () => {
    const { service, primary } = serviceWith([word('日本語')]);
    const result = await service.lookup({
      query: '  日本語  ',
      direction: DictionaryLookupDirection.JA_TO_VI,
      limit: 5,
    });
    expect(result).toMatchObject({
      query: '日本語',
      direction: DictionaryLookupDirection.JA_TO_VI,
    });
    expect(primary.lookup).toHaveBeenCalledWith('日本語', DictionaryLookupDirection.JA_TO_VI);
  });

  it('uses the documented VI_TO_JA fallback only after an empty primary result', async () => {
    const fallbackResult = word('本', VI_WIKTIONARY_SOURCE);
    const { service, primary, fallback } = serviceWith([], [fallbackResult]);
    const result = await service.lookup({
      query: 'sách',
      direction: DictionaryLookupDirection.VI_TO_JA,
    });
    expect(result.results).toEqual([fallbackResult]);
    expect(primary.lookup).toHaveBeenCalledTimes(1);
    expect(fallback.lookup).toHaveBeenCalledTimes(1);
  });

  it('ranks exact results first, bounds output, and caches only the normalized response', async () => {
    const results = [
      word('日本語の本'),
      word('日本語'),
      ...Array.from({ length: 25 }, (_, i) => word(`語${i}`)),
    ];
    const { service, primary } = serviceWith(results);
    const first = await service.lookup({ query: '日本語', limit: 100 });
    const second = await service.lookup({ query: '日本語', limit: 100 });
    expect(first.results).toHaveLength(20);
    expect(first.results[0].writtenForm).toBe('日本語');
    expect(second).toEqual(first);
    expect(primary.lookup).toHaveBeenCalledTimes(1);
  });

  it('returns a typed normal no-result outcome and caches it briefly', async () => {
    const { service, primary } = serviceWith([]);
    await expect(
      service.lookup({ query: 'không có', direction: DictionaryLookupDirection.VI_TO_JA }),
    ).rejects.toMatchObject({
      code: DictionaryErrorCode.NO_RESULT,
    });
    await expect(
      service.lookup({ query: 'không có', direction: DictionaryLookupDirection.VI_TO_JA }),
    ).rejects.toMatchObject({
      code: DictionaryErrorCode.NO_RESULT,
    });
    expect(primary.lookup).toHaveBeenCalledTimes(1);
  });

  it('rejects empty, non-language, and oversized input with a stable code', async () => {
    const { service } = serviceWith([word('unused')]);
    for (const query of ['', '12345', 'x'.repeat(121)]) {
      await expect(service.lookup({ query })).rejects.toBeInstanceOf(DictionaryDomainError);
      await expect(service.lookup({ query })).rejects.toMatchObject({
        code: DictionaryErrorCode.INVALID_QUERY,
      });
    }
  });
});
