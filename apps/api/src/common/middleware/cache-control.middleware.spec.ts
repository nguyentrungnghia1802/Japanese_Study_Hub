import { describe, expect, it } from 'vitest';
import {
  CacheControlMiddleware,
  getResponseCachePolicy,
  NO_STORE_CACHE_CONTROL,
  PRIVATE_REVALIDATION_CACHE_CONTROL,
} from './cache-control.middleware.js';

describe('response cache policy', () => {
  it('allows private revalidation for normal GET reads', () => {
    expect(getResponseCachePolicy('GET', '/api/v1/flashcard-sets?page=1')).toBe(
      'private-revalidation',
    );
    expect(getResponseCachePolicy('HEAD', '/api/v1/exams')).toBe('private-revalidation');
  });

  it('never stores authentication, live attempt, export, health, or mutation responses', () => {
    for (const path of [
      '/api/v1/auth/me',
      '/api/v1/exams/00000000-0000-4000-8000-000000000000/attempts',
      '/api/v1/attempts/00000000-0000-4000-8000-000000000000',
      '/api/v1/exams/00000000-0000-4000-8000-000000000000/export',
      '/health',
      '/health/ready',
    ]) {
      expect(getResponseCachePolicy('GET', path)).toBe('no-store');
    }
    expect(getResponseCachePolicy('POST', '/api/v1/flashcard-sets')).toBe('no-store');
    expect(getResponseCachePolicy('PUT', '/api/v1/attempts/example/answers')).toBe('no-store');
  });

  it('sets private cache and authorization variance without exposing a body', () => {
    const headers = new Map<string, string>();
    const response = {
      setHeader(name: string, value: string) {
        headers.set(name, value);
        return this;
      },
    };
    const next = () => undefined;

    new CacheControlMiddleware().use(
      { method: 'GET', originalUrl: '/api/v1/dashboard/summary' } as never,
      response as never,
      next,
    );

    expect(headers.get('Vary')).toBe('Authorization');
    expect(headers.get('Cache-Control')).toBe(PRIVATE_REVALIDATION_CACHE_CONTROL);
    expect(headers.get('ETag')).toBeUndefined();

    new CacheControlMiddleware().use(
      { method: 'GET', originalUrl: '/api/v1/auth/me' } as never,
      response as never,
      next,
    );
    expect(headers.get('Cache-Control')).toBe(NO_STORE_CACHE_CONTROL);
  });
});
