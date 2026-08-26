import { afterEach, describe, expect, it } from 'vitest';
import {
  resetPrefetchBudget,
  shouldPrefetchRoute,
  TARGETED_PREFETCH_LIMIT,
} from './prefetch-policy.js';

describe('targeted route prefetch policy', () => {
  afterEach(() => resetPrefetchBudget());

  it('prefetches only internal routes once and excludes live attempts', () => {
    expect(shouldPrefetchRoute('/flashcards/set-1')).toBe(true);
    expect(shouldPrefetchRoute('/flashcards/set-1')).toBe(false);
    expect(shouldPrefetchRoute('/exams/exam-1/take')).toBe(false);
    expect(shouldPrefetchRoute('https://example.com')).toBe(false);
  });

  it('enforces a conservative per-tab budget', () => {
    for (let index = 0; index < TARGETED_PREFETCH_LIMIT; index += 1) {
      expect(shouldPrefetchRoute(`/flashcards/set-${index}`)).toBe(true);
    }
    expect(shouldPrefetchRoute('/flashcards/over-budget')).toBe(false);
  });
});
