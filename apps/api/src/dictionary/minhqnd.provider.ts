import { Injectable } from '@nestjs/common';
import {
  DictionaryLookupDirection,
  DictionarySuggestionDto,
  DictionaryWordResultDto,
} from '@japanese-learning/contracts';
import { ProviderHttpClient } from './provider-http-client.js';
import type {
  DictionaryLookupProvider,
  DictionarySuggestionProvider,
} from './dictionary-providers.js';
import { MINHQND_SOURCE } from './provider-sources.js';
import {
  optionalArray,
  optionalString,
  requireArray,
  requireRecord,
  requireString,
  uniqueNonEmpty,
} from './provider-validation.js';

const PROVIDER = 'MINHQND';
const LOOKUP_URL = 'https://dict.minhqnd.com/api/v1/lookup';
const SUGGEST_URL = 'https://dict.minhqnd.com/api/v1/suggest';
const MAX_PROVIDER_ITEMS = 100;

@Injectable()
export class MinhqndDictionaryProvider
  implements DictionaryLookupProvider, DictionarySuggestionProvider
{
  readonly provider = PROVIDER;

  constructor(private readonly http: ProviderHttpClient) {}

  async lookup(
    query: string,
    direction: Exclude<DictionaryLookupDirection, 'AUTO'>,
  ): Promise<DictionaryWordResultDto[]> {
    const url = new URL(LOOKUP_URL);
    url.searchParams.set('word', query);
    if (direction === DictionaryLookupDirection.VI_TO_JA) {
      url.searchParams.set('lang', 'vi');
      url.searchParams.set('def_lang', 'vi');
    }

    const payload = await this.http.getJson(PROVIDER, url.toString());
    if (payload === null) return [];
    const root = requireRecord(payload, PROVIDER);
    const word = requireString(root, 'word', PROVIDER);
    const results = requireArray(root, 'results', PROVIDER).slice(0, MAX_PROVIDER_ITEMS);

    if (direction === DictionaryLookupDirection.VI_TO_JA) {
      return this.normalizeVietnameseToJapanese(word, results);
    }
    return this.normalizeJapaneseToVietnamese(word, results);
  }

  async suggest(query: string, limit: number): Promise<DictionarySuggestionDto[]> {
    const url = new URL(SUGGEST_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit));
    const payload = await this.http.getJson(PROVIDER, url.toString());
    if (payload === null) return [];
    const root = requireRecord(payload, PROVIDER);
    const suggestions = requireArray(root, 'suggestions', PROVIDER)
      .slice(0, MAX_PROVIDER_ITEMS)
      .map((value) => requireString({ value }, 'value', PROVIDER));
    return uniqueNonEmpty(suggestions, limit).map((text) => ({ text }));
  }

  private normalizeJapaneseToVietnamese(
    word: string,
    results: unknown[],
  ): DictionaryWordResultDto[] {
    return results.flatMap((value) => {
      const result = requireRecord(value, PROVIDER);
      if (optionalString(result, 'lang_code') !== 'ja') return [];
      const meanings = optionalArray(result, 'meanings', PROVIDER).map((meaning) =>
        requireRecord(meaning, PROVIDER),
      );
      const vietnameseMeanings = meanings.filter(
        (meaning) => optionalString(meaning, 'definition_lang') === 'vi',
      );
      const definitions = uniqueNonEmpty(
        vietnameseMeanings
          .map((meaning) => optionalString(meaning, 'definition'))
          .filter((definition): definition is string => definition !== null),
        8,
      );
      if (definitions.length === 0) return [];
      return [
        {
          writtenForm: word,
          reading: null,
          meanings: definitions,
          partOfSpeech: uniqueNonEmpty(
            vietnameseMeanings
              .map((meaning) => optionalString(meaning, 'pos'))
              .filter((pos): pos is string => pos !== null),
            5,
          ),
          common: null,
          frequencyRank: null,
          source: MINHQND_SOURCE,
        },
      ];
    });
  }

  private normalizeVietnameseToJapanese(
    word: string,
    results: unknown[],
  ): DictionaryWordResultDto[] {
    const vietnameseEntry = results.find((value) => {
      const result = requireRecord(value, PROVIDER);
      return optionalString(result, 'lang_code') === 'vi';
    });
    if (vietnameseEntry === undefined) return [];

    const result = requireRecord(vietnameseEntry, PROVIDER);
    const meanings = optionalArray(result, 'meanings', PROVIDER).map((meaning) =>
      requireRecord(meaning, PROVIDER),
    );
    const definitions = uniqueNonEmpty(
      meanings
        .filter((meaning) => optionalString(meaning, 'definition_lang') === 'vi')
        .map((meaning) => optionalString(meaning, 'definition'))
        .filter((definition): definition is string => definition !== null),
      8,
    );
    if (definitions.length === 0) return [];

    const translations = optionalArray(result, 'translations', PROVIDER).map((translation) =>
      requireRecord(translation, PROVIDER),
    );
    return uniqueNonEmpty(
      translations
        .filter((translation) => optionalString(translation, 'lang_code') === 'ja')
        .map((translation) => optionalString(translation, 'translation'))
        .filter((translation): translation is string => translation !== null),
      20,
    ).map((writtenForm) => ({
      writtenForm,
      reading: null,
      meanings: definitions,
      partOfSpeech: uniqueNonEmpty(
        meanings
          .map((meaning) => optionalString(meaning, 'pos'))
          .filter((pos): pos is string => pos !== null),
        5,
      ),
      common: null,
      frequencyRank: null,
      source: MINHQND_SOURCE,
    }));
  }
}
