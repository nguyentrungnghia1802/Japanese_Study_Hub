import { Injectable } from '@nestjs/common';
import { DictionaryLookupDirection, DictionaryWordResultDto } from '@japanese-learning/contracts';
import { ProviderHttpClient } from './provider-http-client.js';
import type { DictionaryLookupProvider } from './dictionary-providers.js';
import { VI_WIKTIONARY_SOURCE } from './provider-sources.js';
import {
  requireRecord,
  requireString,
  sanitizeProviderText,
  uniqueNonEmpty,
} from './provider-validation.js';

const PROVIDER = 'VI_WIKTIONARY';
const API_URL = 'https://vi.wiktionary.org/w/api.php';

@Injectable()
export class VietnameseWiktionaryProvider implements DictionaryLookupProvider {
  readonly provider = PROVIDER;

  constructor(private readonly http: ProviderHttpClient) {}

  async lookup(
    query: string,
    direction: Exclude<DictionaryLookupDirection, 'AUTO'>,
  ): Promise<DictionaryWordResultDto[]> {
    if (direction !== DictionaryLookupDirection.VI_TO_JA) return [];

    const url = new URL(API_URL);
    url.searchParams.set('action', 'parse');
    url.searchParams.set('page', query);
    url.searchParams.set('prop', 'wikitext');
    url.searchParams.set('format', 'json');
    url.searchParams.set('formatversion', '2');

    const payload = await this.http.getJson(PROVIDER, url.toString());
    if (payload === null) return [];
    const root = requireRecord(payload, PROVIDER);
    const parsed = requireRecord(root.parse, PROVIDER);
    const wikitext = requireString(parsed, 'wikitext', PROVIDER);
    const translations = extractJapaneseTranslations(wikitext);

    return translations.map((writtenForm) => ({
      writtenForm,
      reading: null,
      meanings: [sanitizeProviderText(query, 120)],
      partOfSpeech: [],
      common: null,
      frequencyRank: null,
      source: VI_WIKTIONARY_SOURCE,
    }));
  }
}

export function extractJapaneseTranslations(wikitext: string): string[] {
  const languageStart = wikitext.indexOf('{{-vie-}}');
  if (languageStart < 0) return [];
  const languageSection = wikitext.slice(languageStart);
  const nextLanguage = languageSection.search(/\{\{-[a-z][a-z-]*-\}\}/u);
  const vietnameseSection =
    nextLanguage > 0 ? languageSection.slice(0, nextLanguage) : languageSection;
  const matches: string[] = [];
  const templatePattern = /\{\{t\+\|ja\|([^|}]+)(?:\|[^}]*)?\}\}/gu;
  for (const match of vietnameseSection.matchAll(templatePattern)) {
    const value = match[1];
    if (value) matches.push(value);
  }
  return uniqueNonEmpty(matches, 20);
}
