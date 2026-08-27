import { describe, expect, it } from 'vitest';
import {
  DICTIONARY_CACHE_POLICY,
  TtlLruCache,
  createDictionaryCacheKey,
  dictionaryCacheTtlMs,
} from './dictionary-cache.js';

describe('dictionary cache policy (TASK-404)', () => {
  it('normalizes Unicode, whitespace, direction, and cache purpose into one key', () => {
    expect(
      createDictionaryCacheKey({
        kind: 'lookup',
        query: '  Ｎ５\u3000日本語  ',
        direction: 'JA_TO_VI',
        limit: 10,
        includeExamples: false,
      }),
    ).toBe(
      createDictionaryCacheKey({
        kind: 'lookup',
        query: 'N5 日本語',
        direction: 'JA_TO_VI',
        limit: 10,
        includeExamples: false,
      }),
    );
    expect(
      createDictionaryCacheKey({ kind: 'lookup', query: '日本語', direction: 'JA_TO_VI' }),
    ).not.toBe(createDictionaryCacheKey({ kind: 'kanji', query: '日本語', direction: 'JA_TO_VI' }));
  });

  it('uses the documented bounded TTLs and keeps failures out of the cache contract', () => {
    expect(dictionaryCacheTtlMs('lookup', true)).toBe(DICTIONARY_CACHE_POLICY.lookupSuccessTtlMs);
    expect(dictionaryCacheTtlMs('kanji', true)).toBe(DICTIONARY_CACHE_POLICY.kanjiSuccessTtlMs);
    expect(dictionaryCacheTtlMs('examples', true)).toBe(
      DICTIONARY_CACHE_POLICY.examplesSuccessTtlMs,
    );
    expect(dictionaryCacheTtlMs('lookup', false)).toBe(DICTIONARY_CACHE_POLICY.noResultTtlMs);
    expect(dictionaryCacheTtlMs('lookup', false)).toBeLessThan(
      DICTIONARY_CACHE_POLICY.lookupSuccessTtlMs,
    );
  });

  it('expires entries and evicts the least recently used item at the hard bound', () => {
    let now = 1_000;
    const cache = new TtlLruCache<string>(2, () => now);
    cache.set('a', 'A', 100);
    cache.set('b', 'B', 100);
    expect(cache.get('a')).toBe('A');
    cache.set('c', 'C', 100);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe('A');
    expect(cache.get('c')).toBe('C');

    now += 101;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('does not retain invalid or non-positive TTL writes', () => {
    const cache = new TtlLruCache<string>(2, () => 1_000);
    cache.set('zero', 'ignored', 0);
    cache.set('negative', 'ignored', -1);
    cache.set('nan', 'ignored', Number.NaN);
    expect(cache.size).toBe(0);
  });
});
