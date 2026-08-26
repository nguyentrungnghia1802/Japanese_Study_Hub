import { FlashcardDto } from './flashcards.dto.js';

export type FlashcardScheduleState = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';
export type FlashcardReviewRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export interface FlashcardScheduleDto {
  state: FlashcardScheduleState;
  dueAt: string;
  stability: number | null;
  difficulty: number | null;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReviewedAt: string | null;
}

export interface FlashcardReviewQueueItemDto extends FlashcardDto {
  schedule: FlashcardScheduleDto;
}

export interface FlashcardReviewSummaryDto {
  serverNow: string;
  dueCount: number;
  newCount: number;
  reviewCount: number;
}

export interface FlashcardReviewQueueResponseDto {
  serverNow: string;
  cards: FlashcardReviewQueueItemDto[];
}

export interface SubmitFlashcardReviewDto {
  rating: FlashcardReviewRating;
  clientRequestId: string;
}

export interface FlashcardReviewResponseDto {
  cardId: string;
  rating: FlashcardReviewRating;
  reviewedAt: string;
  stateBefore: FlashcardScheduleState;
  stateAfter: FlashcardScheduleState;
  dueAtBefore: string;
  dueAtAfter: string;
  schedule: FlashcardScheduleDto;
}
