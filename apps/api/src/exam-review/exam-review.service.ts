import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AttemptStatus,
  LiveExamAttemptDto,
  LiveExamOptionDto,
  QuestionType,
  StartMistakePracticeDto,
  WrongAnswerReviewItemDto,
  WrongAnswerReviewQueueDto,
} from '@japanese-learning/contracts';
import { AttemptsService } from '../attempts/attempts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const MAX_MISTAKE_QUEUE_ITEMS = 20;

const MISTAKE_INCLUDE = {
  exam: {
    select: {
      id: true,
      title: true,
      deletedAt: true,
      contentVersion: true,
    },
  },
  question: {
    select: {
      id: true,
      type: true,
      content: true,
      position: true,
      options: {
        orderBy: { position: 'asc' as const },
        select: { id: true, content: true, position: true },
      },
    },
  },
} satisfies Prisma.ExamMistakeInclude;

const PRACTICE_INCLUDE = {
  exam: {
    select: {
      id: true,
      title: true,
      deletedAt: true,
      contentVersion: true,
    },
  },
  question: {
    select: {
      id: true,
      type: true,
      content: true,
      position: true,
      options: {
        orderBy: { position: 'asc' as const },
        select: { id: true, content: true, position: true, isCorrect: true },
      },
    },
  },
} satisfies Prisma.ExamMistakeInclude;

type MistakeWithContent = Prisma.ExamMistakeGetPayload<{ include: typeof MISTAKE_INCLUDE }>;

@Injectable()
export class ExamReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attemptsService: AttemptsService,
  ) {}

  async getMistakes(
    examId?: string,
    limit = MAX_MISTAKE_QUEUE_ITEMS,
  ): Promise<WrongAnswerReviewQueueDto> {
    const boundedLimit = Number.isFinite(limit)
      ? Math.min(MAX_MISTAKE_QUEUE_ITEMS, Math.max(1, Math.floor(limit)))
      : MAX_MISTAKE_QUEUE_ITEMS;
    const rows = await this.prisma.examMistake.findMany({
      where: {
        ...(examId ? { examId } : {}),
      },
      include: MISTAKE_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: boundedLimit * 2,
    });

    const validRows = rows.filter(
      (row) => row.exam.deletedAt === null && row.exam.contentVersion === row.examVersion,
    );
    const staleIds = rows
      .filter((row) => row.exam.deletedAt !== null || row.exam.contentVersion !== row.examVersion)
      .map((row) => row.id);
    if (staleIds.length > 0) {
      await this.prisma.examMistake.deleteMany({ where: { id: { in: staleIds } } });
    }

    const items = validRows.slice(0, boundedLimit).map((row) => this.toItem(row));
    return { items, total: validRows.length };
  }

  async dismissMistake(id: string): Promise<{ success: boolean }> {
    const deleted = await this.prisma.examMistake.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      throw new NotFoundException(`Mistake with ID '${id}' not found`);
    }
    return { success: true };
  }

  async clearMistakes(examId?: string): Promise<{ success: boolean; removedCount: number }> {
    const result = await this.prisma.examMistake.deleteMany({
      where: examId ? { examId } : undefined,
    });
    return { success: true, removedCount: result.count };
  }

  private toItem(row: MistakeWithContent): WrongAnswerReviewItemDto {
    return {
      id: row.id,
      examId: row.examId,
      examTitle: row.exam.title,
      examVersion: row.examVersion,
      questionId: row.questionId,
      questionType: row.question.type as QuestionType,
      questionContent: row.question.content,
      options: row.question.options.map((option): LiveExamOptionDto => ({
        id: option.id,
        content: option.content,
        position: option.position,
      })),
      selectedOptionId: row.selectedOptionId,
      sourceAttemptId: row.sourceAttemptId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  validatePracticeIds(mistakeIds: string[]): string[] {
    const uniqueIds = [...new Set(mistakeIds)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one mistake is required for practice');
    }
    if (uniqueIds.length > MAX_MISTAKE_QUEUE_ITEMS) {
      throw new BadRequestException(`Practice is limited to ${MAX_MISTAKE_QUEUE_ITEMS} mistakes`);
    }
    return uniqueIds;
  }

  async startPractice(dto: StartMistakePracticeDto): Promise<LiveExamAttemptDto> {
    const mistakeIds = this.validatePracticeIds(dto.mistakeIds);
    const exam = await this.prisma.exam.findFirst({
      where: { id: dto.examId, deletedAt: null },
      select: { id: true, title: true, contentVersion: true },
    });
    if (!exam) {
      throw new NotFoundException(`Exam with ID '${dto.examId}' not found`);
    }

    const rows = await this.prisma.examMistake.findMany({
      where: { id: { in: mistakeIds }, examId: dto.examId },
      include: PRACTICE_INCLUDE,
    });
    if (rows.length !== mistakeIds.length) {
      throw new BadRequestException('One or more selected mistakes are no longer available');
    }
    if (rows.some((row) => row.exam.contentVersion !== row.examVersion)) {
      throw new BadRequestException('Selected mistakes belong to an old exam content version');
    }

    const orderedRows = [...rows].sort(
      (left, right) => left.question.position - right.question.position,
    );
    const snapshot = {
      examId: exam.id,
      examTitle: exam.title,
      examVersion: exam.contentVersion,
      timeLimitSeconds: null,
      isPractice: true,
      questions: orderedRows.map((row) => ({
        id: row.question.id,
        type: row.question.type as QuestionType,
        content: row.question.content,
        position: row.question.position,
        options: row.question.options.map((option) => ({
          id: option.id,
          content: option.content,
          isCorrect: option.isCorrect,
          position: option.position,
        })),
      })),
    };

    const attempt = await this.prisma.examAttempt.create({
      data: {
        examId: exam.id,
        examVersion: exam.contentVersion,
        isPractice: true,
        status: AttemptStatus.IN_PROGRESS,
        totalQuestions: snapshot.questions.length,
        questionOrderSnapshot: snapshot,
      },
    });
    return this.attemptsService.getAttempt(attempt.id);
  }
}
