import { describe, expect, it, vi } from 'vitest';
import {
  DictionaryErrorCode,
  DictionaryKanjiResultDto,
  DictionaryLookupDirection,
} from '@japanese-learning/contracts';
import { DictionaryDomainError } from './dictionary-domain-error.js';
import {
  DictionaryLookupCache,
  DictionaryExampleCache,
  DictionaryLookupService,
  DictionarySuggestionCache,
  isSingleKanji,
  resolveLookupDirection,
} from './dictionary-lookup.service.js';
import { DICTIONARY_CACHE_POLICY } from './dictionary-cache.js';
import { KanjiApiProvider } from './kanjiapi.provider.js';
import { MinhqndDictionaryProvider } from './minhqnd.provider.js';
import { TatoebaProvider } from './tatoeba.provider.js';
import { VietnameseWiktionaryProvider } from './wiktionary.provider.js';
import {
  KANJIAPI_SOURCE,
  MINHQND_SOURCE,
  TATOEBA_SOURCE,
  VI_WIKTIONARY_SOURCE,
} from './provider-sources.js';

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
  kanjiResult: DictionaryKanjiResultDto | null = null,
  examples: DictionaryLookupServiceExample[] = [],
) {
  const primary = {
    lookup: vi.fn().mockResolvedValue(primaryResults),
  } as unknown as MinhqndDictionaryProvider;
  const fallback = {
    lookup: vi.fn().mockResolvedValue(fallbackResults),
  } as unknown as VietnameseWiktionaryProvider;
  const kanji = {
    enrich: vi.fn().mockResolvedValue(kanjiResult),
    relatedWords: vi.fn().mockResolvedValue(kanjiResult?.relatedWords ?? []),
  } as unknown as KanjiApiProvider;
  const exampleProvider = {
    examples: vi.fn().mockResolvedValue(examples),
  } as unknown as TatoebaProvider;
  const cache = new DictionaryLookupCache();
  const service = new DictionaryLookupService(
    primary,
    fallback,
    cache,
    kanji,
    new DictionaryExampleCache(),
    exampleProvider,
    new DictionarySuggestionCache(),
  );
  return { service, primary, fallback, kanji, exampleProvider, cache };
}

type DictionaryLookupServiceExample = {
  japaneseSentence: string;
  vietnameseTranslation: string;
  source: typeof TATOEBA_SOURCE;
};

describe('DictionaryLookupService (TASK-411)', () => {
  it('resolves Japanese script to JA_TO_VI and Latin/diacritic input to VI_TO_JA', () => {
    expect(resolveLookupDirection('日本語')).toBe(DictionaryLookupDirection.JA_TO_VI);
    expect(resolveLookupDirection('ありがとう')).toBe(DictionaryLookupDirection.JA_TO_VI);
    expect(resolveLookupDirection('Nhật Bản')).toBe(DictionaryLookupDirection.VI_TO_JA);
    expect(isSingleKanji('猫')).toBe(true);
    expect(isSingleKanji('日本')).toBe(false);
    expect(isSingleKanji('ね')).toBe(false);
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

  it('keeps many unique lookup responses within the hard cache entry bound', async () => {
    const { service, cache } = serviceWith([word('term')]);

    for (let index = 0; index < DICTIONARY_CACHE_POLICY.maxEntries + 64; index += 1) {
      await service.lookup({
        query: `term-${index}`,
        direction: DictionaryLookupDirection.VI_TO_JA,
        limit: 1,
      });
    }

    expect(cache.size).toBe(DICTIONARY_CACHE_POLICY.maxEntries);
  });

  it('enriches a single kanji and keeps English-only metadata out of Vietnamese meanings', async () => {
    const kanji: DictionaryKanjiResultDto = {
      character: '猫',
      onYomi: ['ビョウ'],
      kunYomi: ['ねこ'],
      vietnameseMeanings: [],
      strokeCount: 11,
      jlpt: 3,
      grade: 8,
      frequencyRank: 1702,
      relatedWords: [{ writtenForm: '猫科', reading: 'ねこか', meaning: null }],
      source: KANJIAPI_SOURCE,
    };
    const { service, kanji: provider } = serviceWith([word('猫')], [], kanji);
    const result = await service.lookup({
      query: '猫',
      direction: DictionaryLookupDirection.JA_TO_VI,
    });
    expect(result.kanji).toMatchObject({
      character: '猫',
      onYomi: ['ビョウ'],
      kunYomi: ['ねこ'],
      vietnameseMeanings: ['Nghĩa tiếng Việt'],
      strokeCount: 11,
      jlpt: 3,
      grade: 8,
      frequencyRank: 1702,
      relatedWords: [{ writtenForm: '猫科', meaning: null }],
    });
    expect(provider.relatedWords).toHaveBeenCalledWith('猫', 10);
  });

  it('returns base lookup when kanji enrichment fails', async () => {
    const { service, kanji } = serviceWith([word('猫')]);
    vi.mocked(kanji.enrich).mockRejectedValueOnce(new Error('provider offline'));
    const result = await service.lookup({
      query: '猫',
      direction: DictionaryLookupDirection.JA_TO_VI,
    });
    expect(result.results).toHaveLength(1);
    expect(result.kanji).toBeNull();
  });

  it('adds optional examples without blocking lookup and reuses the separate example cache', async () => {
    const examples: DictionaryLookupServiceExample[] = [
      {
        japaneseSentence: '日本語を話します。',
        vietnameseTranslation: 'Tôi nói tiếng Nhật.',
        source: TATOEBA_SOURCE,
      },
    ];
    const { service, exampleProvider } = serviceWith([word('日本語')], [], null, examples);
    const first = await service.lookup({
      query: '日本語',
      direction: DictionaryLookupDirection.JA_TO_VI,
      includeExamples: true,
    });
    const second = await service.lookup({
      query: '日本語',
      direction: DictionaryLookupDirection.JA_TO_VI,
      includeExamples: true,
    });
    expect(first.examples).toEqual(examples);
    expect(second.examples).toEqual(examples);
    expect(exampleProvider.examples).toHaveBeenCalledTimes(1);
  });

  it('keeps primary lookup usable when optional examples fail', async () => {
    const { service, exampleProvider } = serviceWith([word('日本語')]);
    vi.mocked(exampleProvider.examples).mockRejectedValueOnce(new Error('Tatoeba unavailable'));
    const result = await service.lookup({
      query: '日本語',
      direction: DictionaryLookupDirection.JA_TO_VI,
      includeExamples: true,
    });
    expect(result.results).toHaveLength(1);
    expect(result.examples).toEqual([]);
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
