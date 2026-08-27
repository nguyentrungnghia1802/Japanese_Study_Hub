import { DictionaryErrorCode } from '@japanese-learning/contracts';
import { DictionaryProviderError } from './dictionary-errors.js';
import { sanitizeProviderHtml } from './sanitize-html-runtime.js';

export function requireRecord(value: unknown, provider: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DictionaryProviderError(DictionaryErrorCode.INVALID_PROVIDER_RESPONSE, provider);
  }
  return value as Record<string, unknown>;
}

export function requireString(
  record: Record<string, unknown>,
  field: string,
  provider: string,
): string {
  const value = record[field];
  if (typeof value !== 'string') {
    throw new DictionaryProviderError(DictionaryErrorCode.INVALID_PROVIDER_RESPONSE, provider);
  }
  return value;
}

export function optionalString(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  return value === undefined || value === null ? null : typeof value === 'string' ? value : null;
}

export function requireArray(
  record: Record<string, unknown>,
  field: string,
  provider: string,
): unknown[] {
  const value = record[field];
  if (!Array.isArray(value)) {
    throw new DictionaryProviderError(DictionaryErrorCode.INVALID_PROVIDER_RESPONSE, provider);
  }
  return value;
}

export function optionalArray(
  record: Record<string, unknown>,
  field: string,
  provider: string,
): unknown[] {
  const value = record[field];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new DictionaryProviderError(DictionaryErrorCode.INVALID_PROVIDER_RESPONSE, provider);
  }
  return value;
}

export function optionalInteger(record: Record<string, unknown>, field: string): number | null {
  const value = record[field];
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

export function uniqueNonEmpty(values: string[], limit: number): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const normalized = sanitizeProviderText(value);
    if (normalized) unique.add(normalized);
    if (unique.size >= limit) break;
  }
  return [...unique];
}

export function sanitizeProviderText(value: string, maxCodePoints = 1_000): string {
  const withoutMarkup = sanitizeProviderHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });
  const withoutControls = withoutMarkup.replace(
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu,
    '',
  );
  return Array.from(withoutControls.normalize('NFKC').trim()).slice(0, maxCodePoints).join('');
}
