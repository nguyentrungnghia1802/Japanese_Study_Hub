import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  DictionaryErrorCode,
  DictionaryKanjiResultDto,
  DictionaryLookupDirection,
  DictionaryWordResultDto,
} from '@japanese-learning/contracts';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { DictionaryHistoryService } from '../src/dictionary/dictionary-history.service.js';
import { KanjiApiProvider } from '../src/dictionary/kanjiapi.provider.js';
import { MinhqndDictionaryProvider } from '../src/dictionary/minhqnd.provider.js';
import { TatoebaProvider } from '../src/dictionary/tatoeba.provider.js';
import { VietnameseWiktionaryProvider } from '../src/dictionary/wiktionary.provider.js';
import { DictionaryProviderError } from '../src/dictionary/dictionary-errors.js';
import {
  KANJIAPI_SOURCE,
  MINHQND_SOURCE,
  VI_WIKTIONARY_SOURCE,
} from '../src/dictionary/provider-sources.js';

const enabled = process.env.RUN_API_INTEGRATION === '1';
const integration = describe.skipIf(!enabled);

function word(
  writtenForm: string,
  source: typeof MINHQND_SOURCE | typeof VI_WIKTIONARY_SOURCE = MINHQND_SOURCE,
): DictionaryWordResultDto {
  return {
    writtenForm,
    reading: null,
    meanings: ['Nghĩa kiểm thử'],
    partOfSpeech: [],
    common: null,
    frequencyRank: null,
    source,
  };
}

type JsonObject = Record<string, unknown>;

integration('Phase 3 dictionary integration against PostgreSQL', () => {
  let app: INestApplication;
  let baseUrl = '';
  let accessToken = '';
  let favoriteId = '';
  const originalEnvironment = new Map<string, string | undefined>();

  const primary = {
    lookup: vi.fn(async (query: string) => {
      if (query === 'sách') return [];
      if (query === 'unavailable') {
        throw new DictionaryProviderError(
          DictionaryErrorCode.PROVIDER_UNAVAILABLE,
          'TEST_PROVIDER',
          503,
          true,
        );
      }
      if (query === 'rate-limited') {
        throw new DictionaryProviderError(
          DictionaryErrorCode.RATE_LIMITED,
          'TEST_PROVIDER',
          429,
          false,
          undefined,
          12,
        );
      }
      return [word(query)];
    }),
    suggest: vi.fn(async () => [{ text: '日本語' }]),
  };
  const fallback = {
    lookup: vi.fn(async () => [word('食べる', VI_WIKTIONARY_SOURCE)]),
  };
  const kanji = {
    enrich: vi.fn(async (character: string): Promise<DictionaryKanjiResultDto | null> =>
      character === '猫'
        ? {
            character,
            onYomi: ['ビョウ'],
            kunYomi: ['ねこ'],
            vietnameseMeanings: [],
            strokeCount: 11,
            jlpt: 3,
            grade: 8,
            frequencyRank: 1702,
            relatedWords: [],
            source: KANJIAPI_SOURCE,
          }
        : null,
    ),
    relatedWords: vi.fn(async () => []),
  };
  const examples = {
    examples: vi.fn(async () => {
      throw new Error('optional example provider unavailable');
    }),
  };

  async function json(response: Response): Promise<JsonObject> {
    return (await response.json()) as JsonObject;
  }

  async function request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(`${baseUrl}/api/v1${path}`, { ...init, headers });
  }

  beforeAll(async () => {
    if (!enabled) return;

    for (const key of [
      'AUTH_USERNAME',
      'AUTH_PASSWORD_HASH',
      'AUTH_TOKEN_SECRET',
      'CORS_ORIGINS',
    ]) {
      originalEnvironment.set(key, process.env[key]);
    }
    process.env.AUTH_USERNAME = 'phase3-integration-user';
    process.env.AUTH_PASSWORD_HASH = await bcrypt.hash('phase3-integration-password', 4);
    process.env.AUTH_TOKEN_SECRET = 'phase3-integration-secret-012345678901234567';
    process.env.CORS_ORIGINS = 'http://127.0.0.1:3000';
    const { AppModule } = await import('../src/app.module.js');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MinhqndDictionaryProvider)
      .useValue(primary)
      .overrideProvider(VietnameseWiktionaryProvider)
      .useValue(fallback)
      .overrideProvider(KanjiApiProvider)
      .useValue(kanji)
      .overrideProvider(TatoebaProvider)
      .useValue(examples)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready'] });
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    if (!enabled) return;
    if (accessToken) {
      if (favoriteId) await request(`/lookup/favorites/${favoriteId}`, { method: 'DELETE' });
      await request('/lookup/history', { method: 'DELETE' });
    }
    if (app) await app.close();
    for (const [key, value] of originalEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('covers authenticated lookup, provider fallbacks, safe errors, and attribution', async () => {
    const unauthorized = await fetch(`${baseUrl}/api/v1/lookup?q=${encodeURIComponent('日本語')}`);
    expect(unauthorized.status).toBe(401);

    const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'phase3-integration-user',
        password: 'phase3-integration-password',
      }),
    });
    expect(login.status).toBe(200);
    const loginBody = await json(login);
    accessToken = String(loginBody.accessToken);
    expect(accessToken).not.toBe('undefined');

    const japanese = await request(`/lookup?q=${encodeURIComponent('日本語')}&direction=JA_TO_VI`);
    expect(japanese.status).toBe(200);
    await expect(json(japanese)).resolves.toMatchObject({
      query: '日本語',
      direction: DictionaryLookupDirection.JA_TO_VI,
      sources: [expect.objectContaining({ provider: 'MINHQND' })],
    });

    const vietnamese = await request(`/lookup?q=${encodeURIComponent('sách')}&direction=VI_TO_JA`);
    expect(vietnamese.status).toBe(200);
    await expect(json(vietnamese)).resolves.toMatchObject({
      query: 'sách',
      direction: DictionaryLookupDirection.VI_TO_JA,
      results: [expect.objectContaining({ writtenForm: '食べる', source: VI_WIKTIONARY_SOURCE })],
    });

    const suggestions = await request(`/lookup/suggest?q=${encodeURIComponent('日本')}`);
    expect(suggestions.status).toBe(200);
    await expect(json(suggestions)).resolves.toMatchObject({
      suggestions: [{ text: '日本語' }],
      source: expect.objectContaining({ provider: 'MINHQND' }),
    });

    const kanjiLookup = await request(
      `/lookup?q=${encodeURIComponent('猫')}&direction=JA_TO_VI&includeExamples=true`,
    );
    expect(kanjiLookup.status).toBe(200);
    await expect(json(kanjiLookup)).resolves.toMatchObject({
      kanji: expect.objectContaining({ character: '猫', source: KANJIAPI_SOURCE }),
      examples: [],
    });

    const unavailable = await request(`/lookup?q=${encodeURIComponent('unavailable')}`);
    expect(unavailable.status).toBe(503);
    const unavailableBody = await json(unavailable);
    expect(JSON.stringify(unavailableBody)).not.toContain('TEST_PROVIDER');

    const rateLimited = await request(`/lookup?q=${encodeURIComponent('rate-limited')}`);
    expect(rateLimited.status).toBe(429);
    expect(rateLimited.headers.get('Retry-After')).toBe('12');
    expect(await json(rateLimited)).toMatchObject({
      error: { code: DictionaryErrorCode.RATE_LIMITED },
    });
  });

  it('covers persisted history pruning/clear and favorite save/list/remove', async () => {
    const history = app.get(DictionaryHistoryService);
    await history.clear();

    for (let index = 0; index < 105; index += 1) {
      await history.record({
        query: `integration-${index}`,
        direction: DictionaryLookupDirection.VI_TO_JA,
        primaryLabel: `Integration ${index}`,
        now: new Date(2_000 + index),
      });
    }

    const historyResponse = await request('/lookup/history');
    expect(historyResponse.status).toBe(200);
    await expect(json(historyResponse)).resolves.toMatchObject({
      total: 100,
      items: expect.arrayContaining([expect.objectContaining({ query: 'integration-104' })]),
    });
    const historyBody = await json(await request('/lookup/history'));
    expect(historyBody.items).toHaveLength(10);

    const saveFavorite = await request('/lookup/favorites', {
      method: 'POST',
      body: JSON.stringify({
        term: '日本語',
        reading: 'にほんご',
        meaningSummary: 'ngôn ngữ Nhật Bản',
        direction: DictionaryLookupDirection.JA_TO_VI,
        sourceProvider: MINHQND_SOURCE.provider,
        sourceName: MINHQND_SOURCE.name,
        sourceUrl: MINHQND_SOURCE.url,
        sourceLicense: MINHQND_SOURCE.license,
        sourceAttribution: MINHQND_SOURCE.attribution,
      }),
    });
    expect(saveFavorite.status).toBe(201);
    const savedFavorite = await json(saveFavorite);
    favoriteId = String(savedFavorite.id);
    expect(savedFavorite).toMatchObject({
      term: '日本語',
      source: { provider: 'MINHQND' },
    });

    const favoriteList = await request('/lookup/favorites');
    expect(favoriteList.status).toBe(200);
    await expect(json(favoriteList)).resolves.toMatchObject({
      total: 1,
      items: [expect.objectContaining({ id: favoriteId, term: '日本語' })],
    });

    const removedFavorite = await request(`/lookup/favorites/${favoriteId}`, { method: 'DELETE' });
    expect(removedFavorite.status).toBe(200);
    expect(await json(removedFavorite)).toMatchObject({ success: true, id: favoriteId });
    favoriteId = '';

    const clearedHistory = await request('/lookup/history', { method: 'DELETE' });
    expect(clearedHistory.status).toBe(200);
    expect(await json(clearedHistory)).toMatchObject({ deleted: 100 });
  });
});
