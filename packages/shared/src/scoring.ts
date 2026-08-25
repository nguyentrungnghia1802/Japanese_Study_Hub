/**
 * Pure scoring calculation according to SCORE-001..003.
 * Equal weight for all questions:
 * score = (correct_count / total_count) * 100
 * Rounding policy: max 2 decimal places, omit unnecessary trailing zeros.
 */
export function calculateExamScore(correctCount: number, totalCount: number): number {
  if (totalCount <= 0) {
    return 0;
  }
  const rawScore = (correctCount / totalCount) * 100;
  // Round to max 2 decimal places and strip unnecessary trailing zeros
  return Math.round(rawScore * 100) / 100;
}

/**
 * Formats score for display (e.g. 100, 33.33, 66.67, 82.5)
 */
export function formatScore(score: number): string {
  if (Number.isInteger(score)) {
    return score.toString();
  }
  return score.toFixed(2).replace(/\.?0+$/, '');
}
