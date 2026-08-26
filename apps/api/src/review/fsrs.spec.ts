import { describe, expect, it } from 'vitest';
import { scheduleFlashcardReview, type FlashcardScheduleInput } from './fsrs.js';

const reviewAt = new Date('2026-08-26T00:00:00.000Z');

function newSchedule(dueAt = reviewAt): FlashcardScheduleInput {
  return {
    state: 'NEW',
    dueAt,
    stability: null,
    difficulty: null,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    lastReviewedAt: null,
  };
}

function nextInput(result: ReturnType<typeof scheduleFlashcardReview>): FlashcardScheduleInput {
  return {
    state: result.stateAfter,
    dueAt: result.dueAtAfter,
    stability: result.stability,
    difficulty: result.difficulty,
    elapsedDays: result.elapsedDays,
    scheduledDays: result.scheduledDays,
    learningSteps: result.learningSteps,
    reps: result.reps,
    lapses: result.lapses,
    lastReviewedAt: result.reviewedAt,
  };
}

describe('FSRS scheduler', () => {
  it('produces the same transition for the same state, rating, and review time', () => {
    const input = newSchedule();

    const first = scheduleFlashcardReview(input, 'GOOD', reviewAt);
    const second = scheduleFlashcardReview(input, 'GOOD', reviewAt);

    expect(second).toEqual(first);
  });

  it.each([
    ['AGAIN', 'LEARNING', 60_000],
    ['HARD', 'LEARNING', 6 * 60_000],
    ['GOOD', 'LEARNING', 10 * 60_000],
    ['EASY', 'REVIEW', 8 * 24 * 60 * 60_000],
  ] as const)('schedules a new card with %s', (rating, state, offset) => {
    const result = scheduleFlashcardReview(newSchedule(), rating, reviewAt);

    expect(result.stateAfter).toBe(state);
    expect(result.dueAtAfter.getTime()).toBe(reviewAt.getTime() + offset);
    expect(result.reps).toBe(1);
  });

  it('progresses a successful learning card into review with increasing intervals', () => {
    const first = scheduleFlashcardReview(newSchedule(), 'GOOD', reviewAt);
    const second = scheduleFlashcardReview(nextInput(first), 'GOOD', first.dueAtAfter);
    const third = scheduleFlashcardReview(nextInput(second), 'GOOD', second.dueAtAfter);

    expect(first.stateAfter).toBe('LEARNING');
    expect(second.stateAfter).toBe('REVIEW');
    expect(second.scheduledDays).toBe(2);
    expect(third.scheduledDays).toBeGreaterThan(second.scheduledDays);
    expect(third.dueAtAfter.getTime()).toBeGreaterThan(second.dueAtAfter.getTime());
  });

  it('maps Again on a review card to relearning and increments lapses', () => {
    const first = scheduleFlashcardReview(newSchedule(), 'EASY', reviewAt);
    const result = scheduleFlashcardReview(nextInput(first), 'AGAIN', first.dueAtAfter);

    expect(result.stateAfter).toBe('RELEARNING');
    expect(result.lapses).toBe(1);
    expect(result.dueAtAfter.getTime()).toBe(first.dueAtAfter.getTime() + 10 * 60_000);
  });

  it('uses the exact UTC review instant across a day boundary', () => {
    const nearMidnight = new Date('2026-08-26T23:59:59.000Z');
    const result = scheduleFlashcardReview(newSchedule(nearMidnight), 'GOOD', nearMidnight);

    expect(result.reviewedAt.toISOString()).toBe('2026-08-26T23:59:59.000Z');
    expect(result.dueAtAfter.toISOString()).toBe('2026-08-27T00:09:59.000Z');
  });
});
