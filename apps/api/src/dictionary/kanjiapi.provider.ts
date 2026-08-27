import { Injectable } from '@nestjs/common';
import {
  DictionaryErrorCode,
  DictionaryKanjiResultDto,
  DictionaryRelatedWordDto,
} from '@japanese-learning/contracts';
import { ProviderHttpClient } from './provider-http-client.js';
import { DictionaryProviderError } from './dictionary-errors.js';
import type { KanjiEnrichmentProvider } from './dictionary-providers.js';
import { KANJIAPI_SOURCE } from './provider-sources.js';
import {
  optionalArray,
  optionalInteger,
  optionalString,
  requireArray,
  requireRecord,
  requireString,
  sanitizeProviderText,
  uniqueNonEmpty,
} from './provider-validation.js';

const PROVIDER = 'KANJIAPI';
const KANJI_URL = 'https://kanjiapi.dev/v1/kanji';
const WORDS_URL = 'https://kanjiapi.dev/v1/words';

@Injectable()
export class KanjiApiProvider implements KanjiEnrichmentProvider {
  readonly provider = PROVIDER;

  constructor(private readonly http: ProviderHttpClient) {}

  async enrich(character: string): Promise<DictionaryKanjiResultDto | null> {
    const url = `${KANJI_URL}/${encodeURIComponent(character)}`;
    const payload = await this.http.getJson(PROVIDER, url);
    if (payload === null) return null;
    const root = requireRecord(payload, PROVIDER);
    const kanji = requireString(root, 'kanji', PROVIDER);
    if (kanji !== character) return null;

    return {
      character: kanji,
      onYomi: stringArray(root, 'on_readings'),
      kunYomi: stringArray(root, 'kun_readings'),
      vietnameseMeanings: [],
      strokeCount: positiveInteger(root, 'stroke_count'),
      jlpt: boundedInteger(root, 'jlpt', 1, 5),
      grade: positiveInteger(root, 'grade'),
      frequencyRank: positiveInteger(root, 'freq_mainichi_shinbun'),
      relatedWords: [],
      source: KANJIAPI_SOURCE,
    };
  }

  async relatedWords(character: string, limit: number): Promise<DictionaryRelatedWordDto[]> {
    const payload = await this.http.getJson(
      PROVIDER,
      `${WORDS_URL}/${encodeURIComponent(character)}`,
    );
    if (payload === null) return [];
    if (!Array.isArray(payload)) {
      throw new DictionaryProviderError(DictionaryErrorCode.INVALID_PROVIDER_RESPONSE, PROVIDER);
    }

    const related: DictionaryRelatedWordDto[] = [];
    for (const value of payload.slice(0, 100)) {
      const entry = requireRecord(value, PROVIDER);
      const variants = optionalArray(entry, 'variants', PROVIDER).map((variant) =>
        requireRecord(variant, PROVIDER),
      );
      for (const variant of variants) {
        const writtenFormValue = optionalString(variant, 'written');
        const readingValue = optionalString(variant, 'pronounced');
        if (!writtenFormValue) continue;
        const writtenForm = sanitizeProviderText(writtenFormValue, 120);
        const reading = readingValue ? sanitizeProviderText(readingValue, 120) : null;
        if (!writtenForm) continue;
        related.push({ writtenForm, reading, meaning: null });
        if (related.length >= limit) return deduplicateRelatedWords(related, limit);
      }
    }
    return deduplicateRelatedWords(related, limit);
  }
}

function stringArray(record: Record<string, unknown>, field: string): string[] {
  return uniqueNonEmpty(
    requireArray(record, field, PROVIDER).map((value) => {
      if (typeof value !== 'string') {
        throw new DictionaryProviderError(DictionaryErrorCode.INVALID_PROVIDER_RESPONSE, PROVIDER);
      }
      return value;
    }),
    20,
  );
}

function positiveInteger(record: Record<string, unknown>, field: string): number | null {
  const value = optionalInteger(record, field);
  return value !== null && value > 0 ? value : null;
}

function boundedInteger(
  record: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
): number | null {
  const value = positiveInteger(record, field);
  return value !== null && value >= min && value <= max ? value : null;
}

function deduplicateRelatedWords(
  values: DictionaryRelatedWordDto[],
  limit: number,
): DictionaryRelatedWordDto[] {
  const seen = new Set<string>();
  const result: DictionaryRelatedWordDto[] = [];
  for (const value of values) {
    const key = `${value.writtenForm}\u001f${value.reading ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}
