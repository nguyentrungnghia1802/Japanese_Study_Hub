import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiError, DEFAULT_API_BASE_URL, resolveApiBaseUrl } from './api-client.js';
import { studyApi } from './study-api.js';
import { DictionaryLookupDirection } from '@japanese-learning/contracts';

describe('apiClient (TASK-021)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves the configured public API URL and keeps the local fallback', () => {
    expect(resolveApiBaseUrl('http://157.173.127.217:4000/api/v1')).toBe(
      'http://157.173.127.217:4000/api/v1',
    );
    expect(resolveApiBaseUrl('  ')).toBe(DEFAULT_API_BASE_URL);
    expect(resolveApiBaseUrl(undefined)).toBe(DEFAULT_API_BASE_URL);
  });

  it('throws ApiError with code on 401 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        },
      }),
    });

    await expect(apiClient('/auth/login', { method: 'POST' })).rejects.toThrow(ApiError);
  });

  it('returns parsed data on 200 response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: 'jwt_token_123',
        expiresIn: 3600,
        user: { username: 'admin' },
      }),
    });
    global.fetch = fetchMock;

    const data = await apiClient<{ accessToken: string }>('/auth/login', { method: 'POST' });
    expect(data.accessToken).toBe('jwt_token_123');
    expect(fetchMock).toHaveBeenCalledWith(
      `${DEFAULT_API_BASE_URL}/auth/login`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('passes AbortSignal through normalized Japanese search requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flashcardSets: [],
        flashcards: [],
        exams: [],
        folders: [],
        total: 0,
      }),
    });
    global.fetch = fetchMock;
    const controller = new AbortController();

    await studyApi.search(' 食べる ', 30, controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      `${DEFAULT_API_BASE_URL}/search?q=%E9%A3%9F%E3%81%B9%E3%82%8B&limit=30`,
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('builds authenticated dictionary lookup, history, and favorite requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [], total: 0 }),
    });
    global.fetch = fetchMock;

    await studyApi.dictionaryLookup(' 日本語 ', DictionaryLookupDirection.JA_TO_VI, 5, true);
    await studyApi.dictionaryHistory(10);
    await studyApi.saveDictionaryFavorite({
      term: '日本語',
      reading: 'にほんご',
      meaningSummary: 'ngôn ngữ Nhật Bản',
      direction: DictionaryLookupDirection.JA_TO_VI,
      source: {
        provider: 'MINHQND',
        name: 'MinhQND',
        url: 'https://dict.minhqnd.com/',
        license: null,
        attribution: 'MinhQND',
      },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${DEFAULT_API_BASE_URL}/lookup?q=%E6%97%A5%E6%9C%AC%E8%AA%9E&direction=JA_TO_VI&limit=5&includeExamples=true`,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${DEFAULT_API_BASE_URL}/lookup/history?limit=10`,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `${DEFAULT_API_BASE_URL}/lookup/favorites`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('reuses the existing flashcard create endpoint for Lookup drafts', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'card-1', setId: 'set-1', front: '日本語', back: 'ngôn ngữ Nhật' }),
    });
    global.fetch = fetchMock;

    await studyApi.createFlashcard('set-1', { front: '日本語\nにほんご', back: 'ngôn ngữ Nhật' });

    expect(fetchMock).toHaveBeenCalledWith(
      `${DEFAULT_API_BASE_URL}/flashcard-sets/set-1/cards`,
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
