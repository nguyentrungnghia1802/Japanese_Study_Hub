import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, FlashcardReviewRating as PrismaReviewRating } from '@prisma/client';
import {
  FlashcardReviewQueueItemDto,
  FlashcardReviewQueueResponseDto,
  FlashcardReviewResponseDto,
  FlashcardReviewSummaryDto,
  FlashcardScheduleDto,
  FlashcardScheduleState,
  FlashcardReviewRating,
} from '@japanese-learning/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubmitReviewBodyDto } from './dto/submit-review.dto.js';
import { scheduleFlashcardReview } from './fsrs.js';

export const MAX_REVIEW_QUEUE_ITEMS = 20;
export const MAX_REVIEW_LOGS_PER_CARD = 500;
export const REVIEW_LOG_RETENTION_DAYS = 365;

const REVIEW_CARD_SELECT = {
  id: true,
  setId: true,
  front: true,
  back: true,
  position: true,
  createdAt: true,
  updatedAt: true,
  fsrsState: true,
  fsrsDueAt: true,
  fsrsStability: true,
  fsrsDifficulty: true,
  fsrsElapsedDays: true,
  fsrsScheduledDays: true,
  fsrsLearningSteps: true,
  fsrsReps: true,
  fsrsLapses: true,
  fsrsLastReviewedAt: true,
} satisfies Prisma.FlashcardSelect;

type ReviewCard = Prisma.FlashcardGetPayload<{ select: typeof REVIEW_CARD_SELECT }>;
type ReviewLog = Prisma.FlashcardReviewLogGetPayload<Prisma.FlashcardReviewLogDefaultArgs>;

function toScheduleDto(card: ReviewCard): FlashcardScheduleDto {
  return {
    state: card.fsrsState as FlashcardScheduleState,
    dueAt: card.fsrsDueAt.toISOString(),
    stability: card.fsrsStability,
    difficulty: card.fsrsDifficulty,
    elapsedDays: card.fsrsElapsedDays,
    scheduledDays: card.fsrsScheduledDays,
    learningSteps: card.fsrsLearningSteps,
    reps: card.fsrsReps,
    lapses: card.fsrsLapses,
    lastReviewedAt: card.fsrsLastReviewedAt?.toISOString() ?? null,
  };
}

function toQueueItem(card: ReviewCard): FlashcardReviewQueueItemDto {
  return {
    id: card.id,
    setId: card.setId,
    front: card.front,
    back: card.back,
    position: card.position,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    schedule: toScheduleDto(card),
  };
}

function toScheduleFromLog(log: ReviewLog): FlashcardScheduleDto {
  return {
    state: log.stateAfter as FlashcardScheduleState,
    dueAt: log.dueAtAfter.toISOString(),
    stability: log.stability,
    difficulty: log.difficulty,
    elapsedDays: log.elapsedDays,
    scheduledDays: log.scheduledDays,
    learningSteps: log.learningSteps,
    reps: log.reps,
    lapses: log.lapses,
    lastReviewedAt: log.reviewedAt.toISOString(),
  };
}

function toReviewResponse(log: ReviewLog): FlashcardReviewResponseDto {
  return {
    cardId: log.flashcardId,
    rating: log.rating as FlashcardReviewRating,
    reviewedAt: log.reviewedAt.toISOString(),
    stateBefore: log.stateBefore as FlashcardScheduleState,
    stateAfter: log.stateAfter as FlashcardScheduleState,
    dueAtBefore: log.dueAtBefore.toISOString(),
    dueAtAfter: log.dueAtAfter.toISOString(),
    schedule: toScheduleFromLog(log),
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function isSerializationConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
}

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(now = new Date()): Promise<FlashcardReviewSummaryDto> {
    const [dueCount, newCount, reviewCount] = await Promise.all([
      this.prisma.flashcard.count({
        where: { deletedAt: null, fsrsDueAt: { lte: now } },
      }),
      this.prisma.flashcard.count({
        where: { deletedAt: null, fsrsState: 'NEW' },
      }),
      this.prisma.flashcard.count({
        where: { deletedAt: null, fsrsState: 'REVIEW' },
      }),
    ]);

    return {
      serverNow: now.toISOString(),
      dueCount,
      newCount,
      reviewCount,
    };
  }

  async getQueue(
    limit = MAX_REVIEW_QUEUE_ITEMS,
    now = new Date(),
  ): Promise<FlashcardReviewQueueResponseDto> {
    const boundedLimit = Number.isFinite(limit)
      ? Math.min(MAX_REVIEW_QUEUE_ITEMS, Math.max(1, Math.floor(limit)))
      : MAX_REVIEW_QUEUE_ITEMS;
    const cards = await this.prisma.flashcard.findMany({
      where: { deletedAt: null, fsrsDueAt: { lte: now } },
      orderBy: [{ fsrsDueAt: 'asc' }, { position: 'asc' }, { id: 'asc' }],
      take: boundedLimit,
      select: REVIEW_CARD_SELECT,
    });

    return {
      serverNow: now.toISOString(),
      cards: cards.map(toQueueItem),
    };
  }

  async submitReview(
    cardId: string,
    dto: SubmitReviewBodyDto,
    now = new Date(),
  ): Promise<FlashcardReviewResponseDto> {
    if (!Number.isFinite(now.getTime())) {
      throw new BadRequestException('Review time must be valid');
    }

    try {
      const log = await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.flashcardReviewLog.findUnique({
            where: {
              flashcardId_clientRequestId: {
                flashcardId: cardId,
                clientRequestId: dto.clientRequestId,
              },
            },
          });
          if (existing) return existing;

          const card = await tx.flashcard.findFirst({
            where: { id: cardId, deletedAt: null },
            select: REVIEW_CARD_SELECT,
          });
          if (!card) {
            throw new NotFoundException(`Flashcard with ID '${cardId}' not found`);
          }

          const transition = scheduleFlashcardReview(
            {
              state: card.fsrsState as FlashcardScheduleState,
              dueAt: card.fsrsDueAt,
              stability: card.fsrsStability,
              difficulty: card.fsrsDifficulty,
              elapsedDays: card.fsrsElapsedDays,
              scheduledDays: card.fsrsScheduledDays,
              learningSteps: card.fsrsLearningSteps,
              reps: card.fsrsReps,
              lapses: card.fsrsLapses,
              lastReviewedAt: card.fsrsLastReviewedAt,
            },
            dto.rating,
            now,
          );

          await tx.flashcard.update({
            where: { id: cardId },
            data: {
              fsrsState: transition.stateAfter,
              fsrsDueAt: transition.dueAtAfter,
              fsrsStability: transition.stability,
              fsrsDifficulty: transition.difficulty,
              fsrsElapsedDays: transition.elapsedDays,
              fsrsScheduledDays: transition.scheduledDays,
              fsrsLearningSteps: transition.learningSteps,
              fsrsReps: transition.reps,
              fsrsLapses: transition.lapses,
              fsrsLastReviewedAt: transition.reviewedAt,
            },
          });

          const created = await tx.flashcardReviewLog.create({
            data: {
              flashcardId: cardId,
              clientRequestId: dto.clientRequestId,
              rating: dto.rating as PrismaReviewRating,
              stateBefore: transition.stateBefore,
              stateAfter: transition.stateAfter,
              reviewedAt: transition.reviewedAt,
              dueAtBefore: transition.dueAtBefore,
              dueAtAfter: transition.dueAtAfter,
              elapsedDays: transition.elapsedDays,
              scheduledDays: transition.scheduledDays,
              learningSteps: transition.learningSteps,
              reps: transition.reps,
              lapses: transition.lapses,
              stability: transition.stability,
              difficulty: transition.difficulty,
            },
          });

          await this.pruneLogs(tx, cardId, now);
          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return toReviewResponse(log);
    } catch (error) {
      if (isUniqueConstraintError(error) || isSerializationConflict(error)) {
        const existing = await this.prisma.flashcardReviewLog.findUnique({
          where: {
            flashcardId_clientRequestId: {
              flashcardId: cardId,
              clientRequestId: dto.clientRequestId,
            },
          },
        });
        if (existing) return toReviewResponse(existing);
      }
      throw error;
    }
  }

  private async pruneLogs(tx: Prisma.TransactionClient, cardId: string, now: Date): Promise<void> {
    const cutoff = new Date(now.getTime() - REVIEW_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await tx.flashcardReviewLog.deleteMany({
      where: { reviewedAt: { lt: cutoff } },
    });

    const overflow = await tx.flashcardReviewLog.findMany({
      where: { flashcardId: cardId },
      orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }],
      skip: MAX_REVIEW_LOGS_PER_CARD,
      select: { id: true },
    });
    if (overflow.length > 0) {
      await tx.flashcardReviewLog.deleteMany({
        where: { id: { in: overflow.map((row) => row.id) } },
      });
    }
  }
}
