import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiError, DEFAULT_API_BASE_URL, resolveApiBaseUrl } from './api-client.js';
import { studyApi } from './study-api.js';

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
});
