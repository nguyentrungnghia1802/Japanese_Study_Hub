import { Injectable } from '@nestjs/common';
import {
  DictionaryErrorCode,
  DictionaryLookupDirection,
  DictionaryLookupRequestDto,
  DictionaryLookupResponseDto,
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
import { MinhqndDictionaryProvider } from './minhqnd.provider.js';
import { VietnameseWiktionaryProvider } from './wiktionary.provider.js';

const JAPANESE_SCRIPT_PATTERN =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9d]/u;
const LATIN_LETTER_PATTERN = /[A-Za-zÀ-ỹ]/u;

@Injectable()
export class DictionaryLookupCache extends TtlLruCache<DictionaryLookupResponseDto> {
  constructor() {
    super(DICTIONARY_CACHE_POLICY.maxEntries);
  }
}

@Injectable()
export class DictionaryLookupService {
  constructor(
    private readonly primaryProvider: MinhqndDictionaryProvider,
    private readonly vietnameseFallback: VietnameseWiktionaryProvider,
    private readonly cache: DictionaryLookupCache,
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
    });
    const cached = this.cache.get(cacheKey);
    if (cached) {
      if (cached.results.length === 0)
        throw new DictionaryDomainError(DictionaryErrorCode.NO_RESULT);
      return cached;
    }

    let results = await this.primaryProvider.lookup(query, direction);
    if (direction === DictionaryLookupDirection.VI_TO_JA && results.length === 0) {
      results = await this.vietnameseFallback.lookup(query, direction);
    }

    const rankedResults = rankDictionaryResults(results, query).slice(0, limit);
    const response: DictionaryLookupResponseDto = {
      query,
      direction,
      results: rankedResults,
      kanji: null,
      examples: [],
      sources: uniqueSources(rankedResults),
    };
    this.cache.set(
      cacheKey,
      response,
      response.results.length > 0
        ? DICTIONARY_CACHE_POLICY.lookupSuccessTtlMs
        : DICTIONARY_CACHE_POLICY.noResultTtlMs,
    );
    if (response.results.length === 0)
      throw new DictionaryDomainError(DictionaryErrorCode.NO_RESULT);
    return response;
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

export function normalizeLookupLimit(limit: number | undefined): number {
  if (limit === undefined) return DICTIONARY_LIMITS.maxResults;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new DictionaryDomainError(DictionaryErrorCode.INVALID_QUERY);
  }
  return Math.min(DICTIONARY_LIMITS.maxResults, limit);
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

function uniqueSources(results: DictionaryWordResultDto[]): DictionaryLookupResponseDto['sources'] {
  const seen = new Set<string>();
  return results.flatMap((result) => {
    if (seen.has(result.source.provider)) return [];
    seen.add(result.source.provider);
    return [result.source];
  });
}
