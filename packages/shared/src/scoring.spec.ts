import { describe, it, expect } from 'vitest';
import { calculateExamScore, formatScore } from './scoring.js';

describe('Scoring Logic (SCORE-001..003)', () => {
  it('calculates 0/10 as 0', () => {
    expect(calculateExamScore(0, 10)).toBe(0);
    expect(formatScore(calculateExamScore(0, 10))).toBe('0');
  });

  it('calculates 10/10 as 100', () => {
    expect(calculateExamScore(10, 10)).toBe(100);
    expect(formatScore(calculateExamScore(10, 10))).toBe('100');
  });

  it('calculates 1/3 as 33.33', () => {
    expect(calculateExamScore(1, 3)).toBe(33.33);
    expect(formatScore(calculateExamScore(1, 3))).toBe('33.33');
  });

  it('calculates 2/3 as 66.67', () => {
    expect(calculateExamScore(2, 3)).toBe(66.67);
    expect(formatScore(calculateExamScore(2, 3))).toBe('66.67');
  });

  it('calculates 41/50 as 82', () => {
    expect(calculateExamScore(41, 50)).toBe(82);
    expect(formatScore(calculateExamScore(41, 50))).toBe('82');
  });

  it('handles 0 total questions safely', () => {
    expect(calculateExamScore(0, 0)).toBe(0);
  });
});
