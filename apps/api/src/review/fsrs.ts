import { fsrs, Rating, State, type CardInput, type Grade } from 'ts-fsrs';
import { FlashcardReviewRating, FlashcardScheduleState } from '@japanese-learning/contracts';

export interface FlashcardScheduleInput {
  state: FlashcardScheduleState;
  dueAt: Date;
  stability: number | null;
  difficulty: number | null;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReviewedAt: Date | null;
}

export interface FlashcardScheduleTransition {
  stateBefore: FlashcardScheduleState;
  stateAfter: FlashcardScheduleState;
  dueAtBefore: Date;
  dueAtAfter: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  reviewedAt: Date;
}

const scheduler = fsrs({
  enable_fuzz: false,
  enable_short_term: true,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m'],
});

function toLibraryState(state: FlashcardScheduleState): State {
  switch (state) {
    case 'NEW':
      return State.New;
    case 'LEARNING':
      return State.Learning;
    case 'REVIEW':
      return State.Review;
    case 'RELEARNING':
      return State.Relearning;
  }
}

function fromLibraryState(state: State): FlashcardScheduleState {
  switch (state) {
    case State.New:
      return 'NEW';
    case State.Learning:
      return 'LEARNING';
    case State.Review:
      return 'REVIEW';
    case State.Relearning:
      return 'RELEARNING';
    default:
      throw new Error(`Unsupported FSRS state '${String(state)}'`);
  }
}

function toLibraryRating(rating: FlashcardReviewRating): Grade {
  switch (rating) {
    case 'AGAIN':
      return Rating.Again;
    case 'HARD':
      return Rating.Hard;
    case 'GOOD':
      return Rating.Good;
    case 'EASY':
      return Rating.Easy;
  }
}

function assertDate(value: Date, label: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid date`);
  }
}

export function scheduleFlashcardReview(
  input: FlashcardScheduleInput,
  rating: FlashcardReviewRating,
  reviewedAt: Date,
): FlashcardScheduleTransition {
  assertDate(input.dueAt, 'dueAt');
  assertDate(reviewedAt, 'reviewedAt');

  const card: CardInput = {
    due: input.dueAt,
    stability: input.stability ?? 0,
    difficulty: input.difficulty ?? 0,
    elapsed_days: input.elapsedDays,
    scheduled_days: input.scheduledDays,
    learning_steps: input.learningSteps,
    reps: input.reps,
    lapses: input.lapses,
    state: toLibraryState(input.state),
    last_review: input.lastReviewedAt,
  };
  const result = scheduler.next(card, reviewedAt, toLibraryRating(rating));

  return {
    stateBefore: input.state,
    stateAfter: fromLibraryState(result.card.state),
    dueAtBefore: new Date(input.dueAt.getTime()),
    dueAtAfter: new Date(result.card.due.getTime()),
    stability: result.card.stability,
    difficulty: result.card.difficulty,
    elapsedDays: result.card.elapsed_days,
    scheduledDays: result.card.scheduled_days,
    learningSteps: result.card.learning_steps,
    reps: result.card.reps,
    lapses: result.card.lapses,
    reviewedAt: new Date(reviewedAt.getTime()),
  };
}
