import { describe, it, expect } from 'vitest';
import HomePage from './page.js';

describe('HomePage', () => {
  it('renders home page component', () => {
    const element = HomePage();
    expect(element).toBeDefined();
    expect(element.type).toBe('main');
  });
});
