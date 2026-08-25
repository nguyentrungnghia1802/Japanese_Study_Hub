/**
 * Pure Japanese and general text utilities.
 */

/**
 * Checks if a string contains Japanese characters (Hiragana, Katakana, Kanji, or full-width punct)
 */
export function containsJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(text);
}

/**
 * Safe string truncation for snippets
 */
export function truncateText(text: string, maxLength = 100): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Normalizes search text for case-insensitive and Unicode matching
 */
export function normalizeSearchTerm(term: string): string {
  return term.trim().toLowerCase();
}
