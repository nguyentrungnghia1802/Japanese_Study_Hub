import type {
  DictionaryExampleResultDto,
  DictionaryKanjiResultDto,
  DictionaryLookupDirection,
  DictionaryRelatedWordDto,
  DictionarySourceAttributionDto,
  DictionarySuggestionDto,
  DictionaryWordResultDto,
} from '@japanese-learning/contracts';

export type ResolvedDictionaryDirection = Exclude<DictionaryLookupDirection, 'AUTO'>;

export interface DictionaryLookupProvider {
  readonly provider: string;
  lookup(query: string, direction: ResolvedDictionaryDirection): Promise<DictionaryWordResultDto[]>;
}

export interface DictionarySuggestionProvider {
  readonly provider: string;
  suggest(query: string, limit: number): Promise<DictionarySuggestionDto[]>;
}

export interface KanjiEnrichmentProvider {
  readonly provider: string;
  enrich(character: string): Promise<DictionaryKanjiResultDto | null>;
  relatedWords(character: string, limit: number): Promise<DictionaryRelatedWordDto[]>;
}

export interface DictionaryExampleProvider {
  readonly provider: string;
  examples(query: string, limit: number): Promise<DictionaryExampleResultDto[]>;
}

export interface DictionaryProviderSource {
  source: DictionarySourceAttributionDto;
}
