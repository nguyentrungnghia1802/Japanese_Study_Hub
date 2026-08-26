import { describe, expect, it } from 'vitest';
import ExamMistakesPage from './page.js';

describe('ExamMistakesPage (TASK-260)', () => {
  it('exports the mistakes review route component', () => {
    expect(typeof ExamMistakesPage).toBe('function');
  });
});
