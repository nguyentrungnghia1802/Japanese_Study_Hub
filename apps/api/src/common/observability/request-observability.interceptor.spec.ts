import { ExecutionContext, Logger } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSafeFailureEvent,
  getSafeRoute,
  RequestObservabilityInterceptor,
} from './request-observability.interceptor.js';

function makeContext(request: object, response: object): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ExecutionContext;
}

describe('RequestObservabilityInterceptor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes route templates and classifies only safe failure events', () => {
    const request = {
      method: 'POST',
      baseUrl: '/api/v1',
      route: { path: '/auth/login' },
    } as Parameters<typeof getSafeRoute>[0];

    expect(getSafeRoute(request)).toBe('/api/v1/auth/login');
    expect(getSafeFailureEvent(request, 401)).toBe('failed_login');
    expect(getSafeFailureEvent(request, 200)).toBeUndefined();
  });

  it('logs duration, slow requests, and safe event names without request bodies', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const now = vi.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(2_500);
    const interceptor = new RequestObservabilityInterceptor();
    const request = {
      method: 'POST',
      baseUrl: '/api/v1',
      route: { path: '/imports/flashcards/confirm' },
      id: 'request-123',
    };
    const response = { statusCode: 400 };

    await lastValueFrom(
      interceptor.intercept(makeContext(request, response), {
        handle: () => of({}),
      }),
    );

    expect(now).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('duration_ms=1500'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('slow_request'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('failed_import'));
    expect(log.mock.calls.join(' ')).not.toContain('password');
  });
});
