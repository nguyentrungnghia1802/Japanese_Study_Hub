import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  isPractice?: boolean;
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
      isPractice: false,
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
      isPractice: false,
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
      isPractice: attempt.isPractice,
    };
  }

  async getSubmittedResult(attemptId: string): Promise<ExamAttemptResultDto> {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID '${attemptId}' not found`);
    }
    if (attempt.status !== AttemptStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted attempts have a graded review');
    }

    const snapshot = attempt.questionOrderSnapshot as unknown as AttemptSnapshot;
    return this.buildGradedResult(attempt, snapshot);
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
    this.validateAnswers(snapshot, dto.answers);

    // Upsert answers transactionally
    await this.prisma.$transaction(async (tx) => {
      // Claim the in-progress row before writing answers. This prevents an
      // answer-save request that started before submit from mutating a
      // finalized attempt after the submit transaction commits.
      const claim = await tx.examAttempt.updateMany({
        where: { id: attemptId, status: AttemptStatus.IN_PROGRESS },
        data: { updatedAt: new Date() },
      });
      if (claim.count === 0) {
        throw new BadRequestException(
          'Cannot save answers on an attempt that is no longer in progress',
        );
      }

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

  private validateAnswers(snapshot: AttemptSnapshot, answers: SaveAnswersBodyDto['answers']): void {
    const questionMap = new Map<string, SnapshotQuestion>();
    snapshot.questions.forEach((question) => questionMap.set(question.id, question));

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw new BadRequestException(
          `Question '${answer.questionId}' does not belong to this attempt`,
        );
      }

      if (answer.selectedOptionId) {
        const optionExists = question.options.some(
          (option) => option.id === answer.selectedOptionId,
        );
        if (!optionExists) {
          throw new BadRequestException(
            `Option '${answer.selectedOptionId}' does not belong to question '${answer.questionId}'`,
          );
        }
      }
    }
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

    const submittedAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.round((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000),
    );
    const totalQuestions = snapshot.questions.length;

    // Claim and finalize the attempt in one transaction. The conditional update
    // serializes concurrent submit requests at the database row, so only the
    // winner can persist mistakes and update the best-result aggregate.
    const { updatedAttempt, isNewBest, bestScore, score, correctCount } =
      await this.prisma.$transaction(async (tx) => {
        const claim = await tx.examAttempt.updateMany({
          where: { id: attemptId, status: AttemptStatus.IN_PROGRESS },
          data: { updatedAt: new Date() },
        });

        if (claim.count === 0) {
          const submittedAttempt = await tx.examAttempt.findUnique({
            where: { id: attemptId },
            include: { answers: true },
          });
          if (!submittedAttempt) {
            throw new NotFoundException(`Attempt with ID '${attemptId}' not found`);
          }
          if (submittedAttempt.status !== AttemptStatus.SUBMITTED) {
            throw new BadRequestException('Attempt cannot be submitted in its current state');
          }
          return {
            updatedAttempt: submittedAttempt,
            isNewBest: false,
            bestScore: Number(submittedAttempt.score ?? 0),
            score: Number(submittedAttempt.score ?? 0),
            correctCount: submittedAttempt.correctCount ?? 0,
          };
        }

        if (dto?.answers && dto.answers.length > 0) {
          this.validateAnswers(snapshot, dto.answers);
          for (const answer of dto.answers) {
            await tx.examAttemptAnswer.upsert({
              where: {
                attemptId_questionId: {
                  attemptId,
                  questionId: answer.questionId,
                },
              },
              update: {
                selectedOptionId: answer.selectedOptionId || null,
              },
              create: {
                attemptId,
                questionId: answer.questionId,
                selectedOptionId: answer.selectedOptionId || null,
              },
            });
          }
        }

        const currentAnswers = await tx.examAttemptAnswer.findMany({
          where: { attemptId },
        });
        const answerMap = new Map<string, string | null>();
        currentAnswers.forEach((answer) =>
          answerMap.set(answer.questionId, answer.selectedOptionId),
        );

        let correctCount = 0;
        snapshot.questions.forEach((question) => {
          const selectedId = answerMap.get(question.id);
          const correctOption = question.options.find((option) => option.isCorrect);
          if (selectedId && correctOption && selectedId === correctOption.id) {
            correctCount++;
          }
        });

        const score = calculateExamScore(correctCount, totalQuestions);

        // 1. Update attempt after the conditional claim.
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

        let newBestFlag = false;
        let currentBestScore = score;

        if (!attempt.isPractice) {
          // 2. Derive mistakes from the immutable submitted snapshot. Practice
          // attempts never create mistakes or official learning history.
          await this.persistMistakes(tx, attempt, snapshot, answerMap, submittedAt);
          await this.pruneMistakes(tx, attempt);

          // 3. Best-result service (TASK-063)
          const existingBest = await tx.examBestResult.findUnique({
            where: {
              userKey_examId_examVersion: {
                userKey: attempt.userKey,
                examId: attempt.examId,
                examVersion: attempt.examVersion,
              },
            },
          });

          if (!existingBest) {
            await tx.examBestResult.create({
              data: {
                examId: attempt.examId,
                examVersion: attempt.examVersion,
                userKey: attempt.userKey,
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
        }

        return {
          updatedAttempt: finalized,
          isNewBest: newBestFlag,
          bestScore: currentBestScore,
          score,
          correctCount,
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
      isPractice: boolean;
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
      isPractice: Boolean(attempt.isPractice || snapshot.isPractice),
    };
  }

  private async persistMistakes(
    tx: Prisma.TransactionClient,
    attempt: { id: string; examId: string; examVersion: number; userKey: string },
    snapshot: AttemptSnapshot,
    answerMap: Map<string, string | null>,
    submittedAt: Date,
  ): Promise<void> {
    for (const question of snapshot.questions) {
      const selectedOptionId = answerMap.get(question.id) ?? null;
      const correctOption = question.options.find((option) => option.isCorrect);
      const isCorrect = Boolean(
        selectedOptionId && correctOption && selectedOptionId === correctOption.id,
      );
      if (isCorrect) continue;

      await tx.examMistake.create({
        data: {
          userKey: attempt.userKey,
          examId: attempt.examId,
          examVersion: attempt.examVersion,
          questionId: question.id,
          sourceAttemptId: attempt.id,
          questionTypeSnapshot: question.type,
          questionContentSnapshot: question.content,
          optionSnapshot: question.options.map((option) => ({
            id: option.id,
            content: option.content,
            position: option.position,
          })),
          questionPosition: question.position,
          selectedOptionId,
          correctOptionId: correctOption?.id ?? null,
          isCorrect,
          isUnanswered: selectedOptionId === null,
          submittedAt,
        },
      });
    }
  }

  private async pruneMistakes(
    tx: Prisma.TransactionClient,
    attempt: { id: string; examId: string; examVersion: number; userKey: string },
  ): Promise<void> {
    const retainedAttempts = await tx.examAttempt.findMany({
      where: {
        examId: attempt.examId,
        examVersion: attempt.examVersion,
        userKey: attempt.userKey,
        status: AttemptStatus.SUBMITTED,
        isPractice: false,
      },
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      take: 3,
      select: { id: true },
    });
    const retainedAttemptIds = retainedAttempts.map(({ id }) => id);
    if (retainedAttemptIds.length === 0) return;

    await tx.examMistake.deleteMany({
      where: {
        userKey: attempt.userKey,
        examId: attempt.examId,
        examVersion: attempt.examVersion,
        sourceAttemptId: { notIn: retainedAttemptIds },
      },
    });
  }
}
