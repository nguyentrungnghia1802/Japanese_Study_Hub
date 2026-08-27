import { Injectable } from '@nestjs/common';
import { DictionaryExampleResultDto } from '@japanese-learning/contracts';
import { ProviderHttpClient } from './provider-http-client.js';
import type { DictionaryExampleProvider } from './dictionary-providers.js';
import { TATOEBA_SOURCE } from './provider-sources.js';
import {
  optionalArray,
  optionalString,
  requireArray,
  requireRecord,
} from './provider-validation.js';

const PROVIDER = 'TATOEBA';
const API_URL = 'https://api.tatoeba.org/v1/sentences';

@Injectable()
export class TatoebaProvider implements DictionaryExampleProvider {
  readonly provider = PROVIDER;

  constructor(private readonly http: ProviderHttpClient) {}

  async examples(query: string, limit: number): Promise<DictionaryExampleResultDto[]> {
    const url = new URL(API_URL);
    url.searchParams.set('lang', 'jpn');
    url.searchParams.set('q', query);
    url.searchParams.set('trans:lang', 'vie');
    url.searchParams.set('showtrans:lang', 'vie');
    url.searchParams.set('sort', 'relevance');
    url.searchParams.set('limit', String(limit));

    const payload = await this.http.getJson(PROVIDER, url.toString());
    if (payload === null) return [];
    const root = requireRecord(payload, PROVIDER);
    const sentences = requireArray(root, 'data', PROVIDER);
    const examples: DictionaryExampleResultDto[] = [];
    for (const value of sentences.slice(0, 20)) {
      const sentence = requireRecord(value, PROVIDER);
      const japaneseSentence = optionalString(sentence, 'text');
      const sentenceId = identifierString(sentence.id);
      const license = optionalString(sentence, 'license');
      const owner = optionalString(sentence, 'owner');
      if (!japaneseSentence || !sentenceId) continue;

      for (const translationValue of optionalArray(sentence, 'translations', PROVIDER)) {
        const translation = requireRecord(translationValue, PROVIDER);
        if (optionalString(translation, 'lang') !== 'vie') continue;
        const vietnameseTranslation = optionalString(translation, 'text');
        if (!vietnameseTranslation) continue;
        examples.push({
          japaneseSentence,
          vietnameseTranslation,
          source: {
            ...TATOEBA_SOURCE,
            url: `https://tatoeba.org/en/sentences/show/${encodeURIComponent(sentenceId)}`,
            license,
            attribution: owner ? `Tatoeba contributor: ${owner}` : TATOEBA_SOURCE.attribution,
          },
        });
        if (examples.length >= limit) return examples;
      }
    }
    return examples;
  }
}

function identifierString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  return typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : null;
}
