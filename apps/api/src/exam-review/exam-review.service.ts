import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AttemptStatus,
  LiveExamAttemptDto,
  LiveExamOptionDto,
  QuestionType,
  StartMistakePracticeDto,
  FrequentMistakeDto,
  FrequentMistakeSummaryDto,
  MistakeAttemptDetailDto,
  MistakeAttemptListDto,
  MistakeAttemptSummaryDto,
  RetainedMistakeItemDto,
  RetainedMistakeOptionDto,
  WrongAnswerReviewItemDto,
  WrongAnswerReviewQueueDto,
} from '@japanese-learning/contracts';
import { AttemptsService } from '../attempts/attempts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const MAX_MISTAKE_QUEUE_ITEMS = 20;
export const MAX_RETAINED_OFFICIAL_ATTEMPTS = 3;
export const MAX_MISTAKE_DETAIL_ITEMS = 100;
const PRIMARY_USER_KEY = 'primary_user';

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

interface MistakeSummarySource {
  id: string;
  examId: string;
  examVersion: number;
  submittedAt: Date | null;
  score: unknown;
  correctCount: number | null;
  totalQuestions: number;
  durationSeconds: number | null;
  _count?: { mistakes: number };
}

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
        userKey: PRIMARY_USER_KEY,
        ...(examId ? { examId } : {}),
      },
      include: MISTAKE_INCLUDE,
      orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      take: boundedLimit * MAX_RETAINED_OFFICIAL_ATTEMPTS,
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

    const newestByQuestion = new Map<string, MistakeWithContent>();
    for (const row of validRows) {
      const key = `${row.examId}:${row.examVersion}:${row.questionId}`;
      if (!newestByQuestion.has(key)) newestByQuestion.set(key, row);
    }
    const deduplicatedRows = [...newestByQuestion.values()];
    const items = deduplicatedRows.slice(0, boundedLimit).map((row) => this.toItem(row));
    return { items, total: deduplicatedRows.length };
  }

  async dismissMistake(id: string): Promise<{ success: boolean }> {
    const deleted = await this.prisma.examMistake.deleteMany({
      where: { id, userKey: PRIMARY_USER_KEY },
    });
    if (deleted.count === 0) {
      throw new NotFoundException(`Mistake with ID '${id}' not found`);
    }
    return { success: true };
  }

  async clearMistakes(examId?: string): Promise<{ success: boolean; removedCount: number }> {
    const result = await this.prisma.examMistake.deleteMany({
      where: examId ? { examId, userKey: PRIMARY_USER_KEY } : { userKey: PRIMARY_USER_KEY },
    });
    return { success: true, removedCount: result.count };
  }

  async getMistakeAttempts(examId: string): Promise<MistakeAttemptListDto> {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deletedAt: null },
      select: { id: true, title: true, contentVersion: true },
    });
    if (!exam) throw new NotFoundException(`Exam with ID '${examId}' not found`);

    const attempts = await this.findRetainedAttempts(exam.id, exam.contentVersion);
    return {
      attempts: attempts.map((attempt) => this.toAttemptSummary(attempt, exam.title)),
    };
  }

  async getMistakeAttemptDetail(attemptId: string): Promise<MistakeAttemptDetailDto> {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        examId: true,
        examVersion: true,
        userKey: true,
        status: true,
        isPractice: true,
        score: true,
        correctCount: true,
        totalQuestions: true,
        durationSeconds: true,
        submittedAt: true,
        startedAt: true,
        exam: { select: { title: true, contentVersion: true, deletedAt: true } },
      },
    });
    if (!attempt || attempt.userKey !== PRIMARY_USER_KEY) {
      throw new NotFoundException(`Mistake attempt '${attemptId}' not found`);
    }
    if (attempt.isPractice || attempt.status !== AttemptStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted official attempts have retained mistakes');
    }
    if (attempt.exam.deletedAt !== null || attempt.exam.contentVersion !== attempt.examVersion) {
      throw new NotFoundException('Mistake history is unavailable for this exam version');
    }

    const retainedAttempts = await this.findRetainedAttempts(attempt.examId, attempt.examVersion);
    if (!retainedAttempts.some((retained) => retained.id === attempt.id)) {
      throw new NotFoundException('Mistake history is no longer retained');
    }

    const rows = await this.prisma.examMistake.findMany({
      where: {
        sourceAttemptId: attempt.id,
        userKey: PRIMARY_USER_KEY,
        examId: attempt.examId,
        examVersion: attempt.examVersion,
      },
      include: MISTAKE_INCLUDE,
      orderBy: [{ questionPosition: 'asc' }, { id: 'asc' }],
      take: MAX_MISTAKE_DETAIL_ITEMS,
    });
    const summary = this.toAttemptSummary(attempt, attempt.exam.title, rows.length);
    return {
      attempt: summary,
      items: rows.map((row) => this.toRetainedItem(row)),
    };
  }

  async getFrequentMistakes(examId: string): Promise<FrequentMistakeSummaryDto> {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deletedAt: null },
      select: { id: true, contentVersion: true },
    });
    if (!exam) throw new NotFoundException(`Exam with ID '${examId}' not found`);

    const attempts = await this.findRetainedAttempts(exam.id, exam.contentVersion);
    if (attempts.length === 0) {
      return {
        examId: exam.id,
        examVersion: exam.contentVersion,
        retainedAttemptCount: 0,
        items: [],
      };
    }

    const rows = await this.prisma.examMistake.findMany({
      where: {
        sourceAttemptId: { in: attempts.map((attempt) => attempt.id) },
        userKey: PRIMARY_USER_KEY,
        examId: exam.id,
        examVersion: exam.contentVersion,
      },
      include: MISTAKE_INCLUDE,
      orderBy: [{ submittedAt: 'desc' }, { questionPosition: 'asc' }, { id: 'asc' }],
      take: MAX_MISTAKE_DETAIL_ITEMS * MAX_RETAINED_OFFICIAL_ATTEMPTS,
    });

    const grouped = new Map<string, MistakeWithContent[]>();
    for (const row of rows) {
      const group = grouped.get(row.questionId) ?? [];
      group.push(row);
      grouped.set(row.questionId, group);
    }
    const items: FrequentMistakeDto[] = [...grouped.values()]
      .map((group) => {
        const newest = group[0];
        const snapshot = this.toSnapshotOptions(newest, true);
        return {
          examId: newest.examId,
          examVersion: newest.examVersion,
          questionId: newest.questionId,
          questionType: (newest.questionTypeSnapshot ?? newest.question.type) as QuestionType,
          questionContent: this.snapshotContent(newest),
          questionPosition: this.snapshotPosition(newest),
          options: snapshot.length > 0 ? snapshot : this.fallbackOptions(newest, true),
          correctOptionId: newest.correctOptionId ?? this.fallbackCorrectOptionId(newest),
          occurrenceCount: group.length,
          retainedAttemptCount: attempts.length,
          sourceAttemptId: newest.sourceAttemptId,
        };
      })
      .sort(
        (left, right) =>
          right.occurrenceCount - left.occurrenceCount ||
          left.questionPosition - right.questionPosition ||
          left.questionId.localeCompare(right.questionId),
      )
      .slice(0, MAX_MISTAKE_DETAIL_ITEMS);

    return {
      examId: exam.id,
      examVersion: exam.contentVersion,
      retainedAttemptCount: attempts.length,
      items,
    };
  }

  private toItem(row: MistakeWithContent): WrongAnswerReviewItemDto {
    const snapshotOptions = this.toSnapshotOptions(row, false);
    return {
      id: row.id,
      examId: row.examId,
      examTitle: row.exam.title,
      examVersion: row.examVersion,
      questionId: row.questionId,
      questionType: (row.questionTypeSnapshot ?? row.question.type) as QuestionType,
      questionContent: this.snapshotContent(row),
      options: (snapshotOptions.length > 0
        ? snapshotOptions
        : this.fallbackOptions(row, false)
      ).map((option): LiveExamOptionDto => ({
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

  private toRetainedItem(row: MistakeWithContent): RetainedMistakeItemDto {
    const snapshotOptions = this.toSnapshotOptions(row, true);
    const options = snapshotOptions.length > 0 ? snapshotOptions : this.fallbackOptions(row, true);
    const selectedOptionId = row.selectedOptionId ?? null;
    return {
      id: row.id,
      examId: row.examId,
      examTitle: row.exam.title,
      examVersion: row.examVersion,
      questionId: row.questionId,
      questionType: (row.questionTypeSnapshot ?? row.question.type) as QuestionType,
      questionContent: this.snapshotContent(row),
      questionPosition: this.snapshotPosition(row),
      options,
      selectedOptionId,
      correctOptionId: row.correctOptionId ?? this.fallbackCorrectOptionId(row),
      isCorrect: Boolean(row.isCorrect),
      isUnanswered: Boolean(row.isUnanswered || selectedOptionId === null),
      sourceAttemptId: row.sourceAttemptId,
      submittedAt: row.submittedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async findRetainedAttempts(examId: string, examVersion: number) {
    return this.prisma.examAttempt.findMany({
      where: {
        examId,
        examVersion,
        userKey: PRIMARY_USER_KEY,
        status: AttemptStatus.SUBMITTED,
        isPractice: false,
      },
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      take: MAX_RETAINED_OFFICIAL_ATTEMPTS,
      select: {
        id: true,
        examId: true,
        examVersion: true,
        submittedAt: true,
        score: true,
        correctCount: true,
        totalQuestions: true,
        durationSeconds: true,
        _count: { select: { mistakes: true } },
      },
    });
  }

  private toAttemptSummary(
    attempt: MistakeSummarySource,
    examTitle: string,
    mistakeCount = attempt._count?.mistakes ?? 0,
  ): MistakeAttemptSummaryDto {
    return {
      attemptId: attempt.id,
      examId: attempt.examId,
      examTitle,
      examVersion: attempt.examVersion,
      submittedAt: (attempt.submittedAt ?? new Date(0)).toISOString(),
      score: Number(attempt.score ?? 0),
      correctCount: attempt.correctCount ?? 0,
      totalQuestions: attempt.totalQuestions,
      durationSeconds: attempt.durationSeconds,
      mistakeCount,
    };
  }

  private snapshotContent(row: {
    questionContentSnapshot: string;
    question: { content: string };
  }): string {
    return (
      (typeof row.questionContentSnapshot === 'string' && row.questionContentSnapshot.trim()) ||
      row.question.content
    );
  }

  private snapshotPosition(row: {
    questionPosition: number;
    question: { position: number };
  }): number {
    return Number.isInteger(row.questionPosition) ? row.questionPosition : row.question.position;
  }

  private toSnapshotOptions(
    row: { optionSnapshot: unknown; correctOptionId?: string | null },
    includeCorrect: boolean,
  ): RetainedMistakeOptionDto[] {
    if (!Array.isArray(row.optionSnapshot)) return [];
    return row.optionSnapshot
      .slice(0, 6)
      .flatMap((value: unknown): RetainedMistakeOptionDto[] => {
        if (!value || typeof value !== 'object') return [];
        const candidate = value as Record<string, unknown>;
        const id = typeof candidate.id === 'string' ? candidate.id : '';
        const content = typeof candidate.content === 'string' ? candidate.content : '';
        const position = typeof candidate.position === 'number' ? candidate.position : 0;
        if (!id || !content) return [];
        return [
          {
            id,
            content,
            position,
            isCorrect: includeCorrect && id === (row.correctOptionId ?? null),
          },
        ];
      })
      .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id));
  }

  private fallbackOptions(
    row: {
      question: {
        options: Array<{ id: string; content: string; position: number; isCorrect?: boolean }>;
      };
    },
    includeCorrect: boolean,
  ): RetainedMistakeOptionDto[] {
    return row.question.options.slice(0, 6).map((option) => ({
      id: option.id,
      content: option.content,
      position: option.position,
      isCorrect: includeCorrect && option.isCorrect === true,
    }));
  }

  private fallbackCorrectOptionId(row: {
    question: { options: Array<{ id: string; isCorrect?: boolean }> };
  }): string | null {
    return row.question.options.find((option) => option.isCorrect === true)?.id ?? null;
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
      where: { id: { in: mistakeIds }, examId: dto.examId, userKey: PRIMARY_USER_KEY },
      include: PRACTICE_INCLUDE,
    });
    if (rows.length !== mistakeIds.length) {
      throw new BadRequestException('One or more selected mistakes are no longer available');
    }
    if (rows.some((row) => row.exam.contentVersion !== row.examVersion)) {
      throw new BadRequestException('Selected mistakes belong to an old exam content version');
    }

    const orderedRows = [...rows].sort(
      (left, right) => this.snapshotPosition(left) - this.snapshotPosition(right),
    );
    const snapshot = {
      examId: exam.id,
      examTitle: exam.title,
      examVersion: exam.contentVersion,
      timeLimitSeconds: null,
      isPractice: true,
      questions: orderedRows.map((row) => ({
        id: row.question.id,
        type: (row.questionTypeSnapshot ?? row.question.type) as QuestionType,
        content: this.snapshotContent(row),
        position: this.snapshotPosition(row),
        options: (this.toSnapshotOptions(row, true).length > 0
          ? this.toSnapshotOptions(row, true)
          : this.fallbackOptions(row, true)
        ).map((option) => ({
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
