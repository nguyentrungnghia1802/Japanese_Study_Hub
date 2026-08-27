export enum DictionaryLookupDirection {
  AUTO = 'AUTO',
  JA_TO_VI = 'JA_TO_VI',
  VI_TO_JA = 'VI_TO_JA',
}

export enum DictionaryErrorCode {
  INVALID_QUERY = 'INVALID_QUERY',
  NO_RESULT = 'NO_RESULT',
  TIMEOUT = 'TIMEOUT',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_PROVIDER_RESPONSE = 'INVALID_PROVIDER_RESPONSE',
}

export type DictionaryProvider = 'MINHQND' | 'VI_WIKTIONARY' | 'KANJIAPI' | 'TATOEBA';

export const DICTIONARY_LIMITS = Object.freeze({
  maxQueryCodePoints: 120,
  maxResults: 20,
  maxSuggestions: 10,
  maxMeanings: 8,
  maxExamples: 5,
  maxRelatedWords: 10,
  maxPartOfSpeech: 5,
  maxSourceAttributions: 6,
});

export interface DictionarySourceAttributionDto {
  provider: DictionaryProvider;
  name: string;
  url: string;
  license: string | null;
  attribution: string;
}

export interface DictionaryWordResultDto {
  writtenForm: string;
  reading: string | null;
  meanings: string[];
  partOfSpeech: string[];
  common: boolean | null;
  frequencyRank: number | null;
  source: DictionarySourceAttributionDto;
}

export interface DictionaryRelatedWordDto {
  writtenForm: string;
  reading: string | null;
  meaning: string | null;
}

export interface DictionaryKanjiResultDto {
  character: string;
  onYomi: string[];
  kunYomi: string[];
  vietnameseMeanings: string[];
  strokeCount: number | null;
  jlpt: number | null;
  grade: number | null;
  frequencyRank: number | null;
  relatedWords: DictionaryRelatedWordDto[];
  source: DictionarySourceAttributionDto;
}

export interface DictionaryExampleResultDto {
  japaneseSentence: string;
  vietnameseTranslation: string;
  source: DictionarySourceAttributionDto;
}

export interface DictionaryLookupRequestDto {
  query: string;
  direction?: DictionaryLookupDirection;
  limit?: number;
  includeExamples?: boolean;
}

export interface DictionaryLookupResponseDto {
  query: string;
  direction: DictionaryLookupDirection;
  results: DictionaryWordResultDto[];
  kanji: DictionaryKanjiResultDto | null;
  examples: DictionaryExampleResultDto[];
  sources: DictionarySourceAttributionDto[];
}

export interface DictionarySuggestionRequestDto {
  query: string;
  direction?: DictionaryLookupDirection;
  limit?: number;
}

export interface DictionarySuggestionDto {
  text: string;
}

export interface DictionarySuggestionResponseDto {
  query: string;
  direction: DictionaryLookupDirection;
  suggestions: DictionarySuggestionDto[];
  source: DictionarySourceAttributionDto;
}

export type ResolvedDictionaryLookupDirection =
  DictionaryLookupDirection.JA_TO_VI | DictionaryLookupDirection.VI_TO_JA;

export interface DictionaryLookupHistoryItemDto {
  id: string;
  query: string;
  direction: ResolvedDictionaryLookupDirection;
  primaryLabel: string | null;
  createdAt: string;
}

export interface DictionaryLookupHistoryResponseDto {
  items: DictionaryLookupHistoryItemDto[];
  total: number;
}

export interface CreateDictionaryFavoriteDto {
  term: string;
  reading: string | null;
  meaningSummary: string;
  direction: ResolvedDictionaryLookupDirection;
  source: DictionarySourceAttributionDto;
}

export interface DictionaryFavoriteDto extends CreateDictionaryFavoriteDto {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface DictionaryFavoriteListResponseDto {
  items: DictionaryFavoriteDto[];
  total: number;
  limit: number;
  offset: number;
}
