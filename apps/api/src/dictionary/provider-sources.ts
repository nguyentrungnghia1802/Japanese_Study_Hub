import type { DictionarySourceAttributionDto } from '@japanese-learning/contracts';

export const MINHQND_SOURCE: DictionarySourceAttributionDto = Object.freeze({
  provider: 'MINHQND',
  name: 'dict.minhqnd.com',
  url: 'https://dict.minhqnd.com/',
  license: 'CC BY-SA 4.0',
  attribution: 'Data/API attribution: @minhqnd; dict.minhqnd.com',
});

export const VI_WIKTIONARY_SOURCE: DictionarySourceAttributionDto = Object.freeze({
  provider: 'VI_WIKTIONARY',
  name: 'Vietnamese Wiktionary',
  url: 'https://vi.wiktionary.org/',
  license: 'CC BY-SA',
  attribution: 'Vietnamese Wiktionary contributors',
});

export const KANJIAPI_SOURCE: DictionarySourceAttributionDto = Object.freeze({
  provider: 'KANJIAPI',
  name: 'kanjiapi.dev',
  url: 'https://kanjiapi.dev/',
  license: 'MIT / provider data terms',
  attribution: 'kanjiapi.dev and its cited KANJIDIC/EDRDG data sources',
});

export const TATOEBA_SOURCE: DictionarySourceAttributionDto = Object.freeze({
  provider: 'TATOEBA',
  name: 'Tatoeba',
  url: 'https://tatoeba.org/',
  license: null,
  attribution: 'Tatoeba contributors; see the sentence-level license',
});
