export type UiPreferenceKey = 'sort' | 'examFolder' | 'libraryTab';

export type UiSortValue = 'createdAt_desc' | 'updatedAt_desc' | 'title_asc';
export type UiLibraryTab = 'ALL' | 'SETS' | 'CARDS' | 'EXAMS' | 'FOLDERS';

export const UI_PREFERENCE_STORAGE_KEYS: Record<UiPreferenceKey, string> = {
  sort: 'jsh_ui_preferences_v1.sort',
  examFolder: 'jsh_ui_preferences_v1.exam_folder',
  libraryTab: 'jsh_ui_preferences_v1.library_tab',
};

const SORT_VALUES: readonly UiSortValue[] = ['createdAt_desc', 'updatedAt_desc', 'title_asc'];
const LIBRARY_TAB_VALUES: readonly UiLibraryTab[] = ['ALL', 'SETS', 'CARDS', 'EXAMS', 'FOLDERS'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PREFERENCE_BYTES = 256;

function byteLength(value: string): number {
  return typeof TextEncoder === 'undefined'
    ? value.length
    : new TextEncoder().encode(value).byteLength;
}

export function isValidUiPreference(key: UiPreferenceKey, value: string): boolean {
  if (byteLength(value) > MAX_PREFERENCE_BYTES) return false;

  switch (key) {
    case 'sort':
      return SORT_VALUES.includes(value as UiSortValue);
    case 'examFolder':
      return value === '' || UUID_PATTERN.test(value);
    case 'libraryTab':
      return LIBRARY_TAB_VALUES.includes(value as UiLibraryTab);
  }
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getUiPreference(key: UiPreferenceKey): string | null {
  const storage = getStorage();
  if (!storage) return null;

  const storageKey = UI_PREFERENCE_STORAGE_KEYS[key];
  try {
    const value = storage.getItem(storageKey);
    if (value === null) return null;
    if (!isValidUiPreference(key, value)) {
      storage.removeItem(storageKey);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function setUiPreference(key: UiPreferenceKey, value: string): boolean {
  const storage = getStorage();
  if (!storage || !isValidUiPreference(key, value)) return false;

  try {
    storage.setItem(UI_PREFERENCE_STORAGE_KEYS[key], value);
    return true;
  } catch {
    return false;
  }
}

export function clearUiPreferences(): void {
  const storage = getStorage();
  if (!storage) return;

  for (const key of Object.values(UI_PREFERENCE_STORAGE_KEYS)) {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore unavailable storage during reset.
    }
  }
}
