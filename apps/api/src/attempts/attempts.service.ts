import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import {
  AttemptStatus,
  QuestionType,
  LiveExamAttemptDto,
  ExamAttemptResultDto,
  QuestionGradedResultDto,
} from '@japanese-learning/contracts';
import { calculateExamScore } from '@japanese-learning/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { SaveAnswersBodyDto } from './dto/save-answers.dto.js';
import { SubmitAttemptBodyDto } from './dto/submit-attempt.dto.js';

interface SnapshotQuestionOption {
  id: string;
  content: string;
  isCorrect: boolean;
  position: number;
}

interface SnapshotQuestion {
  id: string;
  type: QuestionType;
  content: string;
  position: number;
  options: SnapshotQuestionOption[];
}

interface AttemptSnapshot {
  examId: string;
  examTitle: string;
  examVersion: number;
  timeLimitSeconds: number | null;
  questions: SnapshotQuestion[];
}

@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async startAttempt(examId: string): Promise<LiveExamAttemptDto> {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deletedAt: null },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          include: {
            options: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID '${examId}' not found`);
    }

    if (exam.questions.length === 0) {
      throw new BadRequestException('Cannot start attempt on an exam with no questions');
    }

    // Prepare stable questions sequence
    let questionsList: SnapshotQuestion[] = exam.questions.map((q) => ({
      id: q.id,
      type: q.type as QuestionType,
      content: q.content,
      position: q.position,
      options: q.options.map((opt) => ({
        id: opt.id,
        content: opt.content,
        isCorrect: opt.isCorrect,
        position: opt.position,
      })),
    }));

    if (exam.shuffleQuestions) {
      questionsList = [...questionsList].sort(() => Math.random() - 0.5);
    }

    if (exam.shuffleOptions) {
      questionsList = questionsList.map((q) => ({
        ...q,
        options: [...q.options].sort(() => Math.random() - 0.5),
      }));
    }

    const now = new Date();
    const expiresAt = exam.timeLimitSeconds
      ? new Date(now.getTime() + exam.timeLimitSeconds * 1000)
      : null;

    const snapshotData: AttemptSnapshot = {
      examId: exam.id,
      examTitle: exam.title,
      examVersion: exam.contentVersion,
      timeLimitSeconds: exam.timeLimitSeconds,
      questions: questionsList,
    };

    const attempt = await this.prisma.examAttempt.create({
      data: {
        examId: exam.id,
        examVersion: exam.contentVersion,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: now,
        expiresAt,
        totalQuestions: questionsList.length,
        questionOrderSnapshot: JSON.parse(JSON.stringify(snapshotData)),
      },
    });

    this.logger.log(
      `Created attempt '${attempt.id}' for exam '${exam.title}' (version ${exam.contentVersion})`,
    );

    // Return strictly sanitized LiveExamAttemptDto (NO isCorrect leaked)
    return {
      attemptId: attempt.id,
      examId: exam.id,
      examTitle: exam.title,
      examVersion: exam.contentVersion,
      timeLimitSeconds: exam.timeLimitSeconds,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt ? attempt.expiresAt.toISOString() : null,
      status: AttemptStatus.IN_PROGRESS,
      totalQuestions: questionsList.length,
      questions: questionsList.map((q, qIndex) => ({
        id: q.id,
        type: q.type,
        content: q.content,
        position: qIndex,
        options: q.options.map((opt, oIndex) => ({
          id: opt.id,
          content: opt.content,
          position: oIndex,
        })),
      })),
      savedAnswers: {},
    };
  }

  async getAttempt(attemptId: string): Promise<LiveExamAttemptDto> {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID '${attemptId}' not found`);
    }

    const snapshot = attempt.questionOrderSnapshot as unknown as AttemptSnapshot;
    const savedAnswers: Record<string, string | null> = {};
    for (const ans of attempt.answers) {
      savedAnswers[ans.questionId] = ans.selectedOptionId;
    }

    return {
      attemptId: attempt.id,
      examId: attempt.examId,
      examTitle: snapshot.examTitle,
      examVersion: attempt.examVersion,
      timeLimitSeconds: snapshot.timeLimitSeconds,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt ? attempt.expiresAt.toISOString() : null,
      status: attempt.status as AttemptStatus,
      totalQuestions: snapshot.questions.length,
      questions: snapshot.questions.map((q, qIndex) => ({
        id: q.id,
        type: q.type,
        content: q.content,
        position: qIndex,
        options: q.options.map((opt, oIndex) => ({
          id: opt.id,
          content: opt.content,
          position: oIndex,
        })),
      })),
      savedAnswers,
    };
  }

  async saveAnswers(attemptId: string, dto: SaveAnswersBodyDto): Promise<{ success: boolean }> {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID '${attemptId}' not found`);
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Cannot save answers on an attempt that is no longer in progress',
      );
    }

    // Check expiration with a 5-second network grace period
    if (attempt.expiresAt && Date.now() > attempt.expiresAt.getTime() + 5000) {
      throw new BadRequestException('Attempt has expired');
    }

    const snapshot = attempt.questionOrderSnapshot as unknown as AttemptSnapshot;
    const questionMap = new Map<string, SnapshotQuestion>();
    snapshot.questions.forEach((q) => questionMap.set(q.id, q));

    // Validate questions and options
    for (const ans of dto.answers) {
      const q = questionMap.get(ans.questionId);
      if (!q) {
        throw new BadRequestException(
          `Question '${ans.questionId}' does not belong to this attempt`,
        );
      }

      if (ans.selectedOptionId) {
        const optExists = q.options.some((o) => o.id === ans.selectedOptionId);
        if (!optExists) {
          throw new BadRequestException(
            `Option '${ans.selectedOptionId}' does not belong to question '${ans.questionId}'`,
          );
        }
      }
    }

    // Upsert answers transactionally
    await this.prisma.$transaction(async (tx) => {
      for (const ans of dto.answers) {
        await tx.examAttemptAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: ans.questionId,
            },
          },
          update: {
            selectedOptionId: ans.selectedOptionId || null,
          },
          create: {
            attemptId,
            questionId: ans.questionId,
            selectedOptionId: ans.selectedOptionId || null,
          },
        });
      }
    });

    return { success: true };
  }

  async submitAttempt(
    attemptId: string,
    dto?: SubmitAttemptBodyDto,
  ): Promise<ExamAttemptResultDto> {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID '${attemptId}' not found`);
    }

    const snapshot = attempt.questionOrderSnapshot as unknown as AttemptSnapshot;

    // Idempotent submit handling: return existing result if already SUBMITTED
    if (attempt.status === AttemptStatus.SUBMITTED) {
      return this.buildGradedResult(attempt, snapshot);
    }

    // Save any pending answers before final submission
    if (dto?.answers && dto.answers.length > 0) {
      await this.saveAnswers(attemptId, { answers: dto.answers });
    }

    // Refresh answers after saving
    const currentAnswers = await this.prisma.examAttemptAnswer.findMany({
      where: { attemptId },
    });
    const answerMap = new Map<string, string | null>();
    currentAnswers.forEach((a) => answerMap.set(a.questionId, a.selectedOptionId));

    // Calculate score
    let correctCount = 0;
    const totalQuestions = snapshot.questions.length;

    snapshot.questions.forEach((q) => {
      const selectedId = answerMap.get(q.id);
      const correctOpt = q.options.find((o) => o.isCorrect);
      if (selectedId && correctOpt && selectedId === correctOpt.id) {
        correctCount++;
      }
    });

    const score = calculateExamScore(correctCount, totalQuestions);
    const submittedAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.round((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000),
    );

    // Finalize attempt and update best result transactionally
    const { updatedAttempt, isNewBest, bestScore } = await this.prisma.$transaction(async (tx) => {
      // 1. Update attempt
      const finalized = await tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          status: AttemptStatus.SUBMITTED,
          submittedAt,
          score,
          durationSeconds,
          correctCount,
        },
        include: { answers: true },
      });

      // 2. Best-result service (TASK-063)
      const existingBest = await tx.examBestResult.findUnique({
        where: {
          userKey_examId_examVersion: {
            userKey: 'primary_user',
            examId: attempt.examId,
            examVersion: attempt.examVersion,
          },
        },
      });

      let newBestFlag = false;
      let currentBestScore = score;

      if (!existingBest) {
        await tx.examBestResult.create({
          data: {
            examId: attempt.examId,
            examVersion: attempt.examVersion,
            userKey: 'primary_user',
            bestScore: score,
            correctCount,
            totalQuestions,
            durationSeconds,
            attemptCount: 1,
            achievedAt: submittedAt,
            lastAttemptAt: submittedAt,
          },
        });
        newBestFlag = true;
      } else {
        const prevScore = Number(existingBest.bestScore);

        if (score > prevScore) {
          await tx.examBestResult.update({
            where: { id: existingBest.id },
            data: {
              bestScore: score,
              correctCount,
              totalQuestions,
              durationSeconds,
              attemptCount: { increment: 1 },
              achievedAt: submittedAt,
              lastAttemptAt: submittedAt,
            },
          });
          newBestFlag = true;
        } else {
          // Lower or equal score does not replace best score
          await tx.examBestResult.update({
            where: { id: existingBest.id },
            data: {
              attemptCount: { increment: 1 },
              lastAttemptAt: submittedAt,
            },
          });
          currentBestScore = prevScore;
        }
      }

      return {
        updatedAttempt: finalized,
        isNewBest: newBestFlag,
        bestScore: currentBestScore,
      };
    });

    this.logger.log(
      `Attempt '${attemptId}' submitted. Score: ${score}% (${correctCount}/${totalQuestions}). Best: ${bestScore}%`,
    );

    return this.buildGradedResult(updatedAttempt, snapshot, isNewBest, bestScore);
  }

  private buildGradedResult(
    attempt: {
      id: string;
      examId: string;
      examVersion: number;
      status: string;
      score: unknown;
      durationSeconds: number | null;
      startedAt: Date;
      submittedAt: Date | null;
      answers: Array<{ questionId: string; selectedOptionId: string | null }>;
    },
    snapshot: AttemptSnapshot,
    isNewBest = false,
    bestScore?: number,
  ): ExamAttemptResultDto {
    const answerMap = new Map<string, string | null>();
    attempt.answers.forEach((a) => answerMap.set(a.questionId, a.selectedOptionId));

    let correctCount = 0;

    const gradedQuestions: QuestionGradedResultDto[] = snapshot.questions.map((q) => {
      const selectedOptionId = answerMap.get(q.id) || null;
      const correctOpt = q.options.find((o) => o.isCorrect);
      const correctOptionId = correctOpt ? correctOpt.id : '';
      const isCorrect = Boolean(
        selectedOptionId && correctOptionId && selectedOptionId === correctOptionId,
      );

      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        type: q.type,
        content: q.content,
        selectedOptionId,
        correctOptionId,
        isCorrect,
        options: q.options.map((opt, idx) => ({
          id: opt.id,
          content: opt.content,
          position: idx,
          isCorrect: opt.isCorrect,
        })),
      };
    });

    const numericScore =
      attempt.score !== null
        ? Number(attempt.score)
        : calculateExamScore(correctCount, snapshot.questions.length);

    return {
      attemptId: attempt.id,
      examId: attempt.examId,
      examTitle: snapshot.examTitle,
      examVersion: attempt.examVersion,
      status: attempt.status as AttemptStatus,
      score: numericScore,
      correctCount,
      totalQuestions: snapshot.questions.length,
      durationSeconds: attempt.durationSeconds,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt
        ? attempt.submittedAt.toISOString()
        : new Date().toISOString(),
      questions: gradedQuestions,
      isNewBest,
      bestScore: bestScore !== undefined ? bestScore : numericScore,
    };
  }
}
