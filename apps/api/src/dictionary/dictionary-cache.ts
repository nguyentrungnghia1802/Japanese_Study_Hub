export type DictionaryCacheKind = 'lookup' | 'suggestions' | 'kanji' | 'examples';

export const DICTIONARY_CACHE_POLICY = Object.freeze({
  maxEntries: 256,
  lookupSuccessTtlMs: 24 * 60 * 60 * 1000,
  kanjiSuccessTtlMs: 24 * 60 * 60 * 1000,
  examplesSuccessTtlMs: 12 * 60 * 60 * 1000,
  suggestionsSuccessTtlMs: 5 * 60 * 1000,
  noResultTtlMs: 2 * 60 * 1000,
});

export interface DictionaryCacheKeyInput {
  kind: DictionaryCacheKind;
  query: string;
  direction: string;
  limit?: number;
  includeExamples?: boolean;
}

export function normalizeDictionaryQuery(query: string): string {
  return query.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

export function createDictionaryCacheKey(input: DictionaryCacheKeyInput): string {
  return JSON.stringify([
    input.kind,
    input.direction,
    normalizeDictionaryQuery(input.query),
    input.limit ?? null,
    input.includeExamples ?? false,
  ]);
}

export function dictionaryCacheTtlMs(kind: DictionaryCacheKind, hasResult: boolean): number {
  if (!hasResult) return DICTIONARY_CACHE_POLICY.noResultTtlMs;
  switch (kind) {
    case 'lookup':
      return DICTIONARY_CACHE_POLICY.lookupSuccessTtlMs;
    case 'kanji':
      return DICTIONARY_CACHE_POLICY.kanjiSuccessTtlMs;
    case 'examples':
      return DICTIONARY_CACHE_POLICY.examplesSuccessTtlMs;
    case 'suggestions':
      return DICTIONARY_CACHE_POLICY.suggestionsSuccessTtlMs;
  }
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TtlLruCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly maxEntries: number,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new Error('Cache maxEntries must be a positive integer');
    }
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) return;
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    this.evictExpiredAndOldest();
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    this.evictExpired();
    return this.entries.size;
  }

  private evictExpiredAndOldest(): void {
    this.evictExpired();
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (oldestKey === undefined) return;
      this.entries.delete(oldestKey);
    }
  }

  private evictExpired(): void {
    const now = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }
}
