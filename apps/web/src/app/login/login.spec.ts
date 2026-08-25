import { describe, it, expect } from 'vitest';
import LoginPage from './page.js';

describe('LoginPage (TASK-021)', () => {
  it('exports LoginPage component function', () => {
    expect(typeof LoginPage).toBe('function');
  });
});
