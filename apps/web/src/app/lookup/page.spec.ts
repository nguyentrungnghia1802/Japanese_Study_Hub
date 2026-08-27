import { describe, expect, it } from 'vitest';
import { DictionaryLookupDirection } from '@japanese-learning/contracts';
import LookupPage from './page.js';
import {
  hasDictionaryResult,
  normalizeLookupReturnPath,
  parseLookupDirection,
} from '@/lib/lookup-helpers.js';

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

  it('keeps only same-origin bounded return paths for continuity', () => {
    const reviewPath =
      '/exams/review/33333333-3333-4333-8333-333333333333?filter=WRONG&question=44444444-4444-4444-8444-444444444444';
    expect(normalizeLookupReturnPath(reviewPath)).toBe(reviewPath);
    expect(normalizeLookupReturnPath('https://example.test/steal-context')).toBeNull();
    expect(normalizeLookupReturnPath('//example.test/steal-context')).toBeNull();
    expect(normalizeLookupReturnPath(`/${'x'.repeat(512)}`)).toBeNull();
  });
});
