import type { DictionaryLookupResponseDto } from '@japanese-learning/contracts';
import { DictionaryLookupDirection } from '@japanese-learning/contracts';

export function parseLookupDirection(value: string | null): DictionaryLookupDirection {
  return value === DictionaryLookupDirection.JA_TO_VI ||
    value === DictionaryLookupDirection.VI_TO_JA ||
    value === DictionaryLookupDirection.AUTO
    ? value
    : DictionaryLookupDirection.AUTO;
}

export function hasDictionaryResult(
  result: DictionaryLookupResponseDto | null | undefined,
): boolean {
  return Boolean(result && (result.results.length > 0 || result.kanji));
}

export function normalizeLookupReturnPath(value: string | null): string | null {
  if (!value || value.length > 512 || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  if (value.includes('\\')) return null;
  return value;
}
