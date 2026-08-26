import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearUiPreferences,
  getUiPreference,
  isValidUiPreference,
  setUiPreference,
  UI_PREFERENCE_STORAGE_KEYS,
} from './ui-preferences.js';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } as unknown as Storage;
}

describe('bounded UI preferences', () => {
  const storage = createStorage();

  afterEach(() => {
    clearUiPreferences();
    vi.unstubAllGlobals();
  });

  it('allows only documented small values and stores no learning payload', () => {
    vi.stubGlobal('window', { localStorage: storage });

    expect(setUiPreference('sort', 'title_asc')).toBe(true);
    expect(getUiPreference('sort')).toBe('title_asc');
    expect(setUiPreference('sort', JSON.stringify({ front: 'secret learning content' }))).toBe(
      false,
    );
    expect(getUiPreference('sort')).toBe('title_asc');
  });

  it('removes invalid or oversized old values on read', () => {
    vi.stubGlobal('window', { localStorage: storage });
    storage.setItem(UI_PREFERENCE_STORAGE_KEYS.libraryTab, 'INVALID');
    storage.setItem(UI_PREFERENCE_STORAGE_KEYS.examFolder, 'not-a-uuid');

    expect(getUiPreference('libraryTab')).toBeNull();
    expect(getUiPreference('examFolder')).toBeNull();
    expect(storage.getItem(UI_PREFERENCE_STORAGE_KEYS.libraryTab)).toBeNull();
    expect(storage.getItem(UI_PREFERENCE_STORAGE_KEYS.examFolder)).toBeNull();
  });

  it('keeps the allow-list finite and bounded by bytes', () => {
    expect(isValidUiPreference('sort', 'createdAt_desc')).toBe(true);
    expect(isValidUiPreference('libraryTab', 'ALL')).toBe(true);
    expect(isValidUiPreference('examFolder', '')).toBe(true);
    expect(isValidUiPreference('examFolder', 'a'.repeat(257))).toBe(false);
  });
});
