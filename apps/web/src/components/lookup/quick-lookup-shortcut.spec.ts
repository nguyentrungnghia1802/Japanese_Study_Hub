import { describe, expect, it } from 'vitest';
import QuickLookupShortcut, {
  createLookupReturnPath,
  isEditableShortcutTarget,
} from './quick-lookup-shortcut.js';

describe('QuickLookupShortcut (TASK-433)', () => {
  it('exports the lightweight authenticated shortcut and preserves only bounded same-origin paths', () => {
    expect(typeof QuickLookupShortcut).toBe('function');
    expect(createLookupReturnPath('/flashcards/one', '?tab=study')).toBe('/flashcards/one?tab=study');
    expect(createLookupReturnPath('//external.example', '')).toBe('/');
    expect(createLookupReturnPath('/'.repeat(600), '')).toBe('/');
  });

  it('does not treat a missing event target as an editable field', () => {
    expect(isEditableShortcutTarget(null)).toBe(false);
  });
});
