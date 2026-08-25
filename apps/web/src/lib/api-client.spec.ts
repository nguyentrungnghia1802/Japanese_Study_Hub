import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiError } from './api-client.js';

describe('apiClient (TASK-021)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: 'jwt_token_123',
        expiresIn: 3600,
        user: { username: 'admin' },
      }),
    });

    const data = await apiClient<{ accessToken: string }>('/auth/login', { method: 'POST' });
    expect(data.accessToken).toBe('jwt_token_123');
  });
});
