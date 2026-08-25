import { describe, it, expect } from 'vitest';
import DashboardPage from './page.js';

describe('DashboardPage (TASK-092)', () => {
  it('exports DashboardPage component function', () => {
    expect(typeof DashboardPage).toBe('function');
  });
});
