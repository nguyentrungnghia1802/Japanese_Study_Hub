import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DictionaryErrorCode,
  DictionaryLookupDirection,
  DictionaryLookupRequestDto,
  DictionaryLookupResponseDto,
  DictionarySuggestionResponseDto,
  DictionaryWordResultDto,
  DICTIONARY_LIMITS,
} from '@japanese-learning/contracts';
import { DictionaryDomainError } from './dictionary-domain-error.js';
import {
  TtlLruCache,
  DICTIONARY_CACHE_POLICY,
  createDictionaryCacheKey,
} from './dictionary-cache.js';
import type { ResolvedDictionaryDirection } from './dictionary-providers.js';
import { DictionaryProviderError } from './dictionary-errors.js';
import { KanjiApiProvider } from './kanjiapi.provider.js';
import { MinhqndDictionaryProvider } from './minhqnd.provider.js';
import { TatoebaProvider } from './tatoeba.provider.js';
import { VietnameseWiktionaryProvider } from './wiktionary.provider.js';
import { MINHQND_SOURCE } from './provider-sources.js';

const JAPANESE_SCRIPT_PATTERN =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9d]/u;
const SINGLE_KANJI_PATTERN = /^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]$/u;
const LATIN_LETTER_PATTERN = /[A-Za-zÀ-ỹ]/u;

@Injectable()
export class DictionaryLookupCache extends TtlLruCache<DictionaryLookupResponseDto> {
  constructor() {
    super(DICTIONARY_CACHE_POLICY.maxEntries);
  }
}

@Injectable()
export class DictionaryExampleCache extends TtlLruCache<DictionaryLookupResponseDto['examples']> {
  constructor() {
    super(DICTIONARY_CACHE_POLICY.maxEntries);
  }
}

@Injectable()
export class DictionarySuggestionCache extends TtlLruCache<DictionarySuggestionResponseDto> {
  constructor() {
    super(DICTIONARY_CACHE_POLICY.maxEntries);
  }
}

@Injectable()
export class DictionaryLookupService {
  private readonly logger = new Logger(DictionaryLookupService.name);

  constructor(
    @Inject(MinhqndDictionaryProvider)
    private readonly primaryProvider: MinhqndDictionaryProvider,
    @Inject(VietnameseWiktionaryProvider)
    private readonly vietnameseFallback: VietnameseWiktionaryProvider,
    @Inject(DictionaryLookupCache)
    private readonly cache: DictionaryLookupCache,
    @Inject(KanjiApiProvider)
    private readonly kanjiProvider: KanjiApiProvider,
    @Inject(DictionaryExampleCache)
    private readonly exampleCache: DictionaryExampleCache,
    @Inject(TatoebaProvider)
    private readonly exampleProvider: TatoebaProvider,
    @Inject(DictionarySuggestionCache)
    private readonly suggestionCache: DictionarySuggestionCache,
  ) {}

  async lookup(request: DictionaryLookupRequestDto): Promise<DictionaryLookupResponseDto> {
    const query = normalizeLookupQuery(request.query);
    const direction = resolveLookupDirection(query, request.direction);
    const limit = normalizeLookupLimit(request.limit);
    const cacheKey = createDictionaryCacheKey({
      kind: 'lookup',
      query,
      direction,
      limit,
      includeExamples: request.includeExamples ?? false,
    });
    const cached = this.cache.get(cacheKey);
    if (cached) {
      if (cached.results.length === 0 && cached.kanji === null)
        throw new DictionaryDomainError(DictionaryErrorCode.NO_RESULT);
      return cached;
    }

    let results = await this.primaryProvider.lookup(query, direction);
    if (direction === DictionaryLookupDirection.VI_TO_JA && results.length === 0) {
      results = await this.vietnameseFallback.lookup(query, direction);
    }

    const rankedResults = rankDictionaryResults(results, query).slice(0, limit);
    const kanji = await this.enrichSingleKanji(query, direction, rankedResults);
    const examples = request.includeExamples
      ? await this.loadExamples(query, direction, rankedResults)
      : [];
    const response: DictionaryLookupResponseDto = {
      query,
      direction,
      results: rankedResults,
      kanji,
      examples,
      sources: uniqueSources(rankedResults, kanji),
    };
    this.cache.set(
      cacheKey,
      response,
      response.results.length > 0
        ? DICTIONARY_CACHE_POLICY.lookupSuccessTtlMs
        : DICTIONARY_CACHE_POLICY.noResultTtlMs,
    );
    if (response.results.length === 0 && response.kanji === null)
      throw new DictionaryDomainError(DictionaryErrorCode.NO_RESULT);
    return response;
  }

  async suggest(request: {
    query: string;
    direction?: DictionaryLookupDirection;
    limit?: number;
  }): Promise<DictionarySuggestionResponseDto> {
    const query = normalizeLookupQuery(request.query);
    const direction = resolveLookupDirection(query, request.direction);
    const limit = normalizeSuggestionLimit(request.limit);
    const cacheKey = createDictionaryCacheKey({
      kind: 'suggestions',
      query,
      direction,
      limit,
    });
    const cached = this.suggestionCache.get(cacheKey);
    if (cached) return cached;

    const suggestions = (await this.primaryProvider.suggest(query, limit)).slice(0, limit);
    const response: DictionarySuggestionResponseDto = {
      query,
      direction,
      suggestions,
      source: MINHQND_SOURCE,
    };
    this.suggestionCache.set(
      cacheKey,
      response,
      suggestions.length > 0
        ? DICTIONARY_CACHE_POLICY.suggestionsSuccessTtlMs
        : DICTIONARY_CACHE_POLICY.noResultTtlMs,
    );
    return response;
  }

  private async loadExamples(
    query: string,
    direction: ResolvedDictionaryDirection,
    results: DictionaryWordResultDto[],
  ): Promise<DictionaryLookupResponseDto['examples']> {
    const exampleQuery =
      direction === DictionaryLookupDirection.JA_TO_VI ? query : results[0]?.writtenForm;
    if (!exampleQuery) return [];

    const cacheKey = createDictionaryCacheKey({
      kind: 'examples',
      query: exampleQuery,
      direction: DictionaryLookupDirection.JA_TO_VI,
      limit: DICTIONARY_LIMITS.maxExamples,
    });
    const cached = this.exampleCache.get(cacheKey);
    if (cached) return cached;

    try {
      const examples = (
        await this.exampleProvider.examples(exampleQuery, DICTIONARY_LIMITS.maxExamples)
      ).slice(0, DICTIONARY_LIMITS.maxExamples);
      this.exampleCache.set(
        cacheKey,
        examples,
        examples.length > 0
          ? DICTIONARY_CACHE_POLICY.examplesSuccessTtlMs
          : DICTIONARY_CACHE_POLICY.noResultTtlMs,
      );
      return examples;
    } catch (error) {
      this.logEnrichmentFailure(error, 'examples');
      return [];
    }
  }

  private async enrichSingleKanji(
    query: string,
    direction: ResolvedDictionaryDirection,
    results: DictionaryWordResultDto[],
  ): Promise<DictionaryLookupResponseDto['kanji']> {
    if (direction !== DictionaryLookupDirection.JA_TO_VI || !isSingleKanji(query)) return null;

    try {
      const metadata = await this.kanjiProvider.enrich(query);
      if (!metadata) return null;
      const vietnameseMeanings = [...new Set(results.flatMap((result) => result.meanings))].slice(
        0,
        DICTIONARY_LIMITS.maxMeanings,
      );
      let relatedWords = metadata.relatedWords;
      try {
        relatedWords = await this.kanjiProvider.relatedWords(
          query,
          DICTIONARY_LIMITS.maxRelatedWords,
        );
      } catch (error) {
        this.logEnrichmentFailure(error, 'related_words');
      }
      return {
        ...metadata,
        vietnameseMeanings,
        relatedWords: relatedWords.slice(0, DICTIONARY_LIMITS.maxRelatedWords),
      };
    } catch (error) {
      this.logEnrichmentFailure(error, 'metadata');
      return null;
    }
  }

  private logEnrichmentFailure(error: unknown, operation: string): void {
    const code =
      error instanceof DictionaryProviderError
        ? error.code
        : DictionaryErrorCode.PROVIDER_UNAVAILABLE;
    this.logger.warn(`dictionary_kanji_enrichment_failed operation=${operation} code=${code}`);
  }
}

export function normalizeLookupQuery(query: string): string {
  if (typeof query !== 'string') {
    throw new DictionaryDomainError(DictionaryErrorCode.INVALID_QUERY);
  }
  const normalized = query.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  const codePointCount = Array.from(normalized).length;
  if (
    !normalized ||
    codePointCount > DICTIONARY_LIMITS.maxQueryCodePoints ||
    (!JAPANESE_SCRIPT_PATTERN.test(normalized) && !LATIN_LETTER_PATTERN.test(normalized))
  ) {
    throw new DictionaryDomainError(DictionaryErrorCode.INVALID_QUERY);
  }
  return normalized;
}

export function resolveLookupDirection(
  query: string,
  requestedDirection: DictionaryLookupDirection = DictionaryLookupDirection.AUTO,
): ResolvedDictionaryDirection {
  if (requestedDirection !== DictionaryLookupDirection.AUTO) return requestedDirection;
  return JAPANESE_SCRIPT_PATTERN.test(query)
    ? DictionaryLookupDirection.JA_TO_VI
    : DictionaryLookupDirection.VI_TO_JA;
}

export function isSingleKanji(query: string): boolean {
  return Array.from(query).length === 1 && SINGLE_KANJI_PATTERN.test(query);
}

export function normalizeLookupLimit(limit: number | undefined): number {
  if (limit === undefined) return DICTIONARY_LIMITS.maxResults;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new DictionaryDomainError(DictionaryErrorCode.INVALID_QUERY);
  }
  return Math.min(DICTIONARY_LIMITS.maxResults, limit);
}

export function normalizeSuggestionLimit(limit: number | undefined): number {
  if (limit === undefined) return DICTIONARY_LIMITS.maxSuggestions;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new DictionaryDomainError(DictionaryErrorCode.INVALID_QUERY);
  }
  return Math.min(DICTIONARY_LIMITS.maxSuggestions, limit);
}

function rankDictionaryResults(
  results: DictionaryWordResultDto[],
  query: string,
): DictionaryWordResultDto[] {
  return results
    .map((result, index) => ({ result, index, score: resultScore(result, query) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ result }) => result);
}

function resultScore(result: DictionaryWordResultDto, query: string): number {
  const written = result.writtenForm.normalize('NFKC').trim();
  if (written === query) return 1_000;
  if (written.startsWith(query)) return 700;
  const index = written.indexOf(query);
  return index >= 0 ? 500 - Math.min(index, 100) : 0;
}

function uniqueSources(
  results: DictionaryWordResultDto[],
  kanji: DictionaryLookupResponseDto['kanji'],
): DictionaryLookupResponseDto['sources'] {
  const seen = new Set<string>();
  const sources = results.flatMap((result) => {
    if (seen.has(result.source.provider)) return [];
    seen.add(result.source.provider);
    return [result.source];
  });
  if (kanji && !seen.has(kanji.source.provider)) sources.push(kanji.source);
  return sources;
}
