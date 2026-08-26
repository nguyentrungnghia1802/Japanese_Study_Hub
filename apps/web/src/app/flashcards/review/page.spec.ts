import { describe, expect, it } from 'vitest';
import FlashcardReviewPage from './page.js';

describe('FlashcardReviewPage (TASK-252)', () => {
  it('exports the review route component', () => {
    expect(typeof FlashcardReviewPage).toBe('function');
  });
});
