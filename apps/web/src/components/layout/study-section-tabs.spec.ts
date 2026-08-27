import { describe, expect, it } from 'vitest';
import { getStudySectionTabs, isStudySectionTabActive } from './study-section-tabs.js';

describe('StudySectionTabs', () => {
  it('keeps Review nested under Flashcards and Mistakes nested under Exams', () => {
    expect(getStudySectionTabs('flashcards').map((tab) => tab.href)).toEqual([
      '/flashcards',
      '/flashcards/review',
    ]);
    expect(getStudySectionTabs('exams').map((tab) => tab.href)).toEqual([
      '/exams',
      '/exams/mistakes',
    ]);
  });

  it('activates only the matching nested destination', () => {
    expect(isStudySectionTabActive('/flashcards', '/flashcards')).toBe(true);
    expect(isStudySectionTabActive('/flashcards/review', '/flashcards')).toBe(false);
    expect(isStudySectionTabActive('/flashcards/review', '/flashcards/review')).toBe(true);
    expect(isStudySectionTabActive('/exams', '/exams')).toBe(true);
    expect(isStudySectionTabActive('/exams/mistakes', '/exams')).toBe(false);
    expect(isStudySectionTabActive('/exams/mistakes', '/exams/mistakes')).toBe(true);
  });
});
