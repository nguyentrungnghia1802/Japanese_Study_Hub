import { describe, expect, it } from 'vitest';
import { DictionaryLookupDirection } from '@japanese-learning/contracts';
import LookupPage from './page.js';
import { hasDictionaryResult, parseLookupDirection } from '@/lib/lookup-helpers.js';

describe('LookupPage (TASK-430)', () => {
  it('is a client route component and parses only supported URL directions', () => {
    expect(typeof LookupPage).toBe('function');
    expect(parseLookupDirection('VI_TO_JA')).toBe(DictionaryLookupDirection.VI_TO_JA);
    expect(parseLookupDirection('unknown')).toBe(DictionaryLookupDirection.AUTO);
    expect(parseLookupDirection(null)).toBe(DictionaryLookupDirection.AUTO);
  });

  it('recognizes word and single-kanji normalized results without exposing provider payloads', () => {
    expect(
      hasDictionaryResult({
        query: '本',
        direction: DictionaryLookupDirection.JA_TO_VI,
        results: [],
        kanji: null,
        examples: [],
        sources: [],
      }),
    ).toBe(false);
    expect(
      hasDictionaryResult({
        query: '本',
        direction: DictionaryLookupDirection.JA_TO_VI,
        results: [],
        kanji: {
          character: '本',
          onYomi: ['ホン'],
          kunYomi: ['もと'],
          vietnameseMeanings: ['sách'],
          strokeCount: 5,
          jlpt: 5,
          grade: 1,
          frequencyRank: 1,
          relatedWords: [],
          source: {
            provider: 'KANJIAPI',
            name: 'kanjiapi.dev',
            url: 'https://kanjiapi.dev/',
            license: null,
            attribution: 'kanjiapi.dev',
          },
        },
        examples: [],
        sources: [],
      }),
    ).toBe(true);
  });
});
