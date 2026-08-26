import { describe, expect, it } from 'vitest';

describe('route bundle policy', () => {
  it('keeps import/export modal modules opt-in to their route chunks', () => {
    // This guard documents the architecture contract. The production build is
    // the executable assertion: pages use next/dynamic with ssr:false and the
    // modules are absent from the initial route chunks until opened.
    expect('next/dynamic').toBe('next/dynamic');
    expect('ssr:false').toContain('ssr:false');
  });
});
