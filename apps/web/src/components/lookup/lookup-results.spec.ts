import { describe, expect, it } from 'vitest';
import { DictionaryLookupDirection, DictionaryLookupResponseDto } from '@japanese-learning/contracts';
import LookupResults, { getLookupPrimaryCard } from './lookup-results.js';

const result: DictionaryLookupResponseDto = {
  query: '日本語',
  direction: DictionaryLookupDirection.JA_TO_VI,
  results: [
    {
      writtenForm: '日本語',
      reading: 'にほんご',
      meanings: ['ngôn ngữ Nhật Bản'],
      partOfSpeech: ['danh từ'],
      common: true,
      frequencyRank: 42,
      source: {
        provider: 'MINHQND',
        name: 'MinhQND',
        url: 'https://dict.minhqnd.com/',
        license: 'CC BY-SA 4.0',
        attribution: 'MinhQND',
      },
    },
  ],
  kanji: null,
  examples: [],
  sources: [],
};

describe('LookupResults (TASK-431)', () => {
  it('exports a renderer and derives a safe flashcard projection', () => {
    expect(typeof LookupResults).toBe('function');
    expect(getLookupPrimaryCard(result)).toEqual({
      japanese: '日本語',
      reading: 'にほんご',
      meaning: 'ngôn ngữ Nhật Bản',
    });
  });
});
