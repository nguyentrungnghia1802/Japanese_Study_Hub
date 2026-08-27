import { describe, expect, it, vi } from 'vitest';
import { DictionaryLookupDirection } from '@japanese-learning/contracts';
import { KanjiApiProvider } from './kanjiapi.provider.js';
import { MinhqndDictionaryProvider } from './minhqnd.provider.js';
import { ProviderHttpClient } from './provider-http-client.js';
import { TatoebaProvider } from './tatoeba.provider.js';
import {
  VietnameseWiktionaryProvider,
  extractJapaneseTranslations,
} from './wiktionary.provider.js';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function httpFor(payloads: unknown[]): ProviderHttpClient {
  const fetchImpl = vi.fn().mockImplementation(async (url: string) => {
    const payload = payloads.shift();
    if (payload === undefined) throw new Error(`unexpected provider request ${url}`);
    return jsonResponse(payload);
  });
  return new ProviderHttpClient({ fetchImpl, sleep: async () => undefined });
}

describe('dictionary provider adapters', () => {
  it('normalizes Japanese and Vietnamese dictionary results without raw fields', async () => {
    const provider = new MinhqndDictionaryProvider(
      httpFor([
        {
          exists: true,
          word: '日本語',
          results: [
            {
              lang_code: 'ja',
              meanings: [
                { definition: 'Tiếng Nhật', definition_lang: 'vi', pos: 'Danh từ' },
                { definition: 'English gloss', definition_lang: 'en', pos: 'noun' },
              ],
            },
          ],
          ignored_internal_field: 'not exposed',
        },
      ]),
    );
    const jaToVi = await provider.lookup('日本語', DictionaryLookupDirection.JA_TO_VI);
    expect(jaToVi).toEqual([
      expect.objectContaining({
        writtenForm: '日本語',
        meanings: ['Tiếng Nhật'],
        partOfSpeech: ['Danh từ'],
      }),
    ]);
    expect(jaToVi[0]).not.toHaveProperty('ignored_internal_field');

    const reverseProvider = new MinhqndDictionaryProvider(
      httpFor([
        {
          word: 'Nhật Bản',
          results: [
            {
              lang_code: 'vi',
              meanings: [{ definition: 'Quốc đảo', definition_lang: 'vi', pos: 'Danh từ' }],
              translations: [
                { lang_code: 'ja', translation: '日本' },
                { lang_code: 'en', translation: 'Japan' },
              ],
            },
          ],
        },
      ]),
    );
    await expect(
      reverseProvider.lookup('Nhật Bản', DictionaryLookupDirection.VI_TO_JA),
    ).resolves.toEqual([expect.objectContaining({ writtenForm: '日本', meanings: ['Quốc đảo'] })]);
  });

  it('normalizes suggestions and parses only explicit Vietnamese Wiktionary Japanese templates', async () => {
    const provider = new MinhqndDictionaryProvider(
      httpFor([{ suggestions: [' 学生 ', '学生', ''] }]),
    );
    await expect(provider.suggest('学生', 10)).resolves.toEqual([{ text: '学生' }]);

    expect(
      extractJapaneseTranslations(
        '{{-vie-}}\n{{-trans-}}\n* {{t+|ja|本}}\n* {{t+|en|book}}\n{{-eng-}}',
      ),
    ).toEqual(['本']);
    const fallback = new VietnameseWiktionaryProvider(
      httpFor([{ parse: { title: 'sách', wikitext: '{{-vie-}}\n{{-trans-}}\n* {{t+|ja|本}}' } }]),
    );
    await expect(fallback.lookup('sách', DictionaryLookupDirection.VI_TO_JA)).resolves.toEqual([
      expect.objectContaining({ writtenForm: '本', meanings: ['sách'] }),
    ]);
  });

  it('maps kanji metadata and never promotes English glosses to Vietnamese', async () => {
    const provider = new KanjiApiProvider(
      httpFor([
        {
          kanji: '猫',
          on_readings: ['ビョウ'],
          kun_readings: ['ねこ'],
          meanings: ['cat'],
          stroke_count: 11,
          jlpt: 3,
          grade: 8,
          freq_mainichi_shinbun: 1702,
        },
        [
          {
            meanings: [{ glosses: ['cat'] }],
            variants: [{ written: '猫科', pronounced: 'ねこか', priorities: [] }],
          },
        ],
      ]),
    );
    const metadata = await provider.enrich('猫');
    expect(metadata).toMatchObject({
      character: '猫',
      onYomi: ['ビョウ'],
      kunYomi: ['ねこ'],
      strokeCount: 11,
      jlpt: 3,
      grade: 8,
      frequencyRank: 1702,
      vietnameseMeanings: [],
    });
    await expect(provider.relatedWords('猫', 10)).resolves.toEqual([
      { writtenForm: '猫科', reading: 'ねこか', meaning: null },
    ]);
  });

  it('maps Tatoeba sentence pairs with sentence attribution', async () => {
    const provider = new TatoebaProvider(
      httpFor([
        {
          data: [
            {
              id: 123,
              text: '猫が嫌い。',
              license: 'CC BY 2.0 FR',
              owner: 'small_snow',
              translations: [
                { id: 456, text: 'Tôi ghét mèo.', lang: 'vie' },
                { id: 789, text: 'I hate cats.', lang: 'eng' },
              ],
            },
          ],
        },
      ]),
    );
    await expect(provider.examples('猫', 5)).resolves.toEqual([
      expect.objectContaining({
        japaneseSentence: '猫が嫌い。',
        vietnameseTranslation: 'Tôi ghét mèo.',
        source: expect.objectContaining({
          license: 'CC BY 2.0 FR',
          attribution: 'Tatoeba contributor: small_snow',
        }),
      }),
    ]);
  });
});
