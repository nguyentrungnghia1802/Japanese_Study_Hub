import { describe, expect, it, vi } from 'vitest';
import { DictionaryErrorCode } from '@japanese-learning/contracts';
import { DictionaryProviderError } from './dictionary-errors.js';
import { ProviderHttpClient, DEFAULT_PROVIDER_MAX_RESPONSE_BYTES } from './provider-http-client.js';

function response(body: string, status = 200, headers?: Record<string, string>): Response {
  return new Response(body, { status, headers });
}

describe('ProviderHttpClient', () => {
  it('retries one transient 5xx and parses a bounded JSON response', async () => {
    const fetchImpl = vi
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(response('{"temporary":true}', 503))
      .mockResolvedValueOnce(response('{"ok":true}'));
    const client = new ProviderHttpClient({ fetchImpl, sleep: async () => undefined });

    await expect(client.getJson('TEST', 'https://provider.test/data')).resolves.toEqual({
      ok: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry a rate-limit response', async () => {
    const fetchImpl = vi
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(response('{"error":"slow down"}', 429));
    const client = new ProviderHttpClient({ fetchImpl, sleep: async () => undefined });

    const error = await client
      .getJson('TEST', 'https://provider.test/data')
      .catch((value: unknown) => value);
    expect(error).toBeInstanceOf(DictionaryProviderError);
    expect(error).toMatchObject({ code: DictionaryErrorCode.RATE_LIMITED, statusCode: 429 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('maps a strict timeout after bounded transient retries', async () => {
    const fetchImpl = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('timed out', 'AbortError')),
          );
        }),
    );
    const client = new ProviderHttpClient({
      fetchImpl,
      timeoutMs: 5,
      retryDelayMs: 0,
      sleep: async () => undefined,
    });

    const error = await client
      .getJson('TEST', 'https://provider.test/data')
      .catch((value: unknown) => value);
    expect(error).toMatchObject({ code: DictionaryErrorCode.TIMEOUT });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('rejects oversized or malformed provider bodies at the boundary', async () => {
    const oversized = new ProviderHttpClient({
      fetchImpl: vi.fn().mockResolvedValue(
        response('{"x":1}', 200, {
          'content-length': String(DEFAULT_PROVIDER_MAX_RESPONSE_BYTES + 1),
        }),
      ),
    });
    await expect(oversized.getJson('TEST', 'https://provider.test/data')).rejects.toMatchObject({
      code: DictionaryErrorCode.INVALID_PROVIDER_RESPONSE,
    });

    const malformed = new ProviderHttpClient({
      fetchImpl: vi.fn().mockResolvedValue(response('not-json')),
    });
    await expect(malformed.getJson('TEST', 'https://provider.test/data')).rejects.toMatchObject({
      code: DictionaryErrorCode.INVALID_PROVIDER_RESPONSE,
    });
  });
});
