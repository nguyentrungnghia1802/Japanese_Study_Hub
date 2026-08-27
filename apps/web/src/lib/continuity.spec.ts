import { beforeEach, describe, expect, it } from 'vitest';
import {
  CONTINUITY_TTL_MS,
  clearExamReviewContinuity,
  clearFlashcardStudyContinuity,
  readExamReviewContinuity,
  readFlashcardStudyContinuity,
  resolveFlashcardStudyOrder,
  writeExamReviewContinuity,
  writeFlashcardStudyContinuity,
} from './continuity.js';

const setId = '11111111-1111-4111-8111-111111111111';
const examId = '22222222-2222-4222-8222-222222222222';
const attemptId = '33333333-3333-4333-8333-333333333333';
const cardIds = [
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
];

function installSessionStorage(): void {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    },
  });
}

describe('bounded lookup continuity', () => {
  beforeEach(() => installSessionStorage());

  it('restores normal, shuffled, flipped, and completed flashcard metadata without payloads', () => {
    expect(
      writeFlashcardStudyContinuity({
        setId,
        sessionId: 'session-1',
        cardIds: [cardIds[2], cardIds[0], cardIds[1]],
        currentCardId: cardIds[0],
        currentIndex: 1,
        isFlipped: true,
        isShuffled: true,
        isCompleted: false,
        progress: 66,
        returnTo: `/flashcards/${setId}/study`,
      }),
    ).toBe(true);
    const saved = readFlashcardStudyContinuity(setId);
    expect(saved?.cardIds).toEqual([cardIds[2], cardIds[0], cardIds[1]]);
    expect(saved?.currentCardId).toBe(cardIds[0]);
    expect(saved?.isFlipped).toBe(true);
    expect(saved?.isShuffled).toBe(true);
    expect(saved?.progress).toBe(66);
    expect(saved).not.toHaveProperty('front');
    expect(saved).not.toHaveProperty('back');
  });

  it('falls back when an underlying card was added or deleted', () => {
    const saved = {
      kind: 'flashcard-study' as const,
      setId,
      sessionId: 'session-1',
      cardIds,
      currentCardId: cardIds[1],
      currentIndex: 1,
      isFlipped: true,
      isShuffled: true,
      isCompleted: false,
      progress: 66,
      returnTo: `/flashcards/${setId}/study`,
      updatedAt: Date.now(),
      expiresAt: Date.now() + CONTINUITY_TTL_MS,
    };
    expect(resolveFlashcardStudyOrder(saved, cardIds)).toEqual(cardIds);
    expect(resolveFlashcardStudyOrder(saved, cardIds.slice(0, 2))).toBeNull();
    expect(
      resolveFlashcardStudyOrder(saved, [
        ...cardIds,
        '77777777-7777-4777-8777-777777777777',
      ]),
    ).toBeNull();
  });

  it('expires and clears submitted review metadata while keeping only bounded IDs', () => {
    writeExamReviewContinuity(
      {
        attemptId,
        examId,
        examVersion: 2,
        currentQuestionId: cardIds[0],
        filter: 'WRONG',
        scrollTop: 420,
        returnTo: `/exams/${examId}/review/${attemptId}`,
      },
      1000,
    );
    expect(readExamReviewContinuity(attemptId, 1000)?.filter).toBe('WRONG');
    expect(readExamReviewContinuity(attemptId, 1000 + CONTINUITY_TTL_MS + 1)).toBeNull();
    clearExamReviewContinuity(attemptId);
    clearFlashcardStudyContinuity(setId);
    expect(readFlashcardStudyContinuity(setId)).toBeNull();
  });
});
