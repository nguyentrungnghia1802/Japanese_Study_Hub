import { describe, expect, it } from 'vitest';
import ExamPracticePage from './page.js';

describe('ExamPracticePage (TASK-261)', () => {
  it('exports the Practice route component', () => {
    expect(typeof ExamPracticePage).toBe('function');
  });
});
