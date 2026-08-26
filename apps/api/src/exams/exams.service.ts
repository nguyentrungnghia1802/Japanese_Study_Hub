import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ExamDto, QuestionType, CreateExamQuestionDto } from '@japanese-learning/contracts';
import { exportExamToMarkdown } from '@japanese-learning/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateExamBodyDto } from './dto/create-exam.dto.js';
import { UpdateExamMetadataBodyDto } from './dto/update-exam-metadata.dto.js';
import { UpdateExamContentBodyDto } from './dto/update-exam-content.dto.js';

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates V1 question constraints:
   * - Type MUST be MULTIPLE_CHOICE_SINGLE
   * - 2 to 6 options
   * - Exactly 1 correct option
   */
  validateQuestions(questions: CreateExamQuestionDto[]): void {
    questions.forEach((q, qIndex) => {
      if (q.type && q.type !== QuestionType.MULTIPLE_CHOICE_SINGLE) {
        throw new BadRequestException(
          `Question ${qIndex + 1}: only MULTIPLE_CHOICE_SINGLE is supported in V1`,
        );
      }

      if (!q.content || !q.content.trim()) {
        throw new BadRequestException(`Question ${qIndex + 1}: prompt content is required`);
      }

      if (!q.options || q.options.length < 2 || q.options.length > 6) {
        throw new BadRequestException(
          `Question ${qIndex + 1}: must have between 2 and 6 options (found ${q.options?.length || 0})`,
        );
      }

      const correctCount = q.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        throw new BadRequestException(
          `Question ${qIndex + 1}: must have exactly 1 correct option (found ${correctCount})`,
        );
      }

      q.options.forEach((opt, oIndex) => {
        if (!opt.content || !opt.content.trim()) {
          throw new BadRequestException(
            `Question ${qIndex + 1}, Option ${oIndex + 1}: option content cannot be empty`,
          );
        }
      });
    });
  }

  async createExam(dto: CreateExamBodyDto): Promise<ExamDto> {
    if (dto.folderId) {
      const folder = await this.prisma.examFolder.findFirst({
        where: { id: dto.folderId, deletedAt: null },
      });
      if (!folder) {
        throw new NotFoundException(`Folder with ID '${dto.folderId}' not found`);
      }
    }

    if (dto.questions && dto.questions.length > 0) {
      this.validateQuestions(dto.questions);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          folderId: dto.folderId || null,
          coverRef: dto.coverRef?.trim() || null,
          timeLimitSeconds: dto.timeLimitSeconds ?? null,
          shuffleQuestions: dto.shuffleQuestions ?? false,
          shuffleOptions: dto.shuffleOptions ?? false,
          contentVersion: 1,
        },
      });

      if (dto.questions && dto.questions.length > 0) {
        for (let i = 0; i < dto.questions.length; i++) {
          const q = dto.questions[i];
          const question = await tx.examQuestion.create({
            data: {
              examId: exam.id,
              type: q.type || QuestionType.MULTIPLE_CHOICE_SINGLE,
              content: q.content.trim(),
              position: q.position ?? i,
            },
          });

          await tx.examOption.createMany({
            data: q.options.map((opt, oIndex) => ({
              questionId: question.id,
              content: opt.content.trim(),
              isCorrect: opt.isCorrect,
              position: opt.position ?? oIndex,
            })),
          });
        }
      }

      return exam;
    });

    return this.getExam(created.id);
  }

  async listExams(params?: {
    folderId?: string | null;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<{ items: ExamDto[]; total: number }> {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || 20));
    const skip = (page - 1) * limit;

    const where: {
      deletedAt: null;
      folderId?: string | null;
      OR?: Array<{
        title?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      deletedAt: null,
    };

    if (params?.folderId !== undefined) {
      where.folderId = params.folderId;
    }

    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const orderBy =
      params?.sort === 'title_asc'
        ? [{ title: 'asc' as const }]
        : params?.sort === 'updatedAt_desc'
          ? [{ updatedAt: 'desc' as const }]
          : [{ createdAt: 'desc' as const }];

    const [exams, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: { questions: true },
          },
          bestResults: {
            orderBy: { bestScore: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.exam.count({ where }),
    ]);

    return {
      items: exams.map((e) => {
        const best = e.bestResults[0];
        return {
          id: e.id,
          folderId: e.folderId,
          title: e.title,
          description: e.description,
          coverRef: e.coverRef,
          timeLimitSeconds: e.timeLimitSeconds,
          contentVersion: e.contentVersion,
          shuffleQuestions: e.shuffleQuestions,
          shuffleOptions: e.shuffleOptions,
          questionCount: e._count.questions,
          bestScore: best ? Number(best.bestScore) : null,
          createdAt: e.createdAt.toISOString(),
          updatedAt: e.updatedAt.toISOString(),
        };
      }),
      total,
    };
  }

  async getExam(id: string): Promise<ExamDto> {
    const exam = await this.prisma.exam.findFirst({
      where: { id, deletedAt: null },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          include: {
            options: {
              orderBy: { position: 'asc' },
            },
          },
        },
        bestResults: {
          orderBy: { bestScore: 'desc' },
          take: 1,
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID '${id}' not found`);
    }

    const best = exam.bestResults[0];

    return {
      id: exam.id,
      folderId: exam.folderId,
      title: exam.title,
      description: exam.description,
      coverRef: exam.coverRef,
      timeLimitSeconds: exam.timeLimitSeconds,
      contentVersion: exam.contentVersion,
      shuffleQuestions: exam.shuffleQuestions,
      shuffleOptions: exam.shuffleOptions,
      questionCount: exam.questions.length,
      bestScore: best ? Number(best.bestScore) : null,
      questions: exam.questions.map((q) => ({
        id: q.id,
        examId: q.examId,
        type: q.type as QuestionType,
        content: q.content,
        position: q.position,
        contextId: q.contextId,
        options: q.options.map((o) => ({
          id: o.id,
          content: o.content,
          position: o.position,
          isCorrect: o.isCorrect,
        })),
      })),
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString(),
    };
  }

  /**
   * Metadata update (does NOT increment contentVersion)
   */
  async updateExamMetadata(id: string, dto: UpdateExamMetadataBodyDto): Promise<ExamDto> {
    await this.getExam(id); // verify existence

    if (dto.folderId) {
      const folder = await this.prisma.examFolder.findFirst({
        where: { id: dto.folderId, deletedAt: null },
      });
      if (!folder) {
        throw new NotFoundException(`Folder with ID '${dto.folderId}' not found`);
      }
    }

    await this.prisma.exam.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.folderId !== undefined ? { folderId: dto.folderId } : {}),
        ...(dto.coverRef !== undefined ? { coverRef: dto.coverRef?.trim() || null } : {}),
        ...(dto.timeLimitSeconds !== undefined ? { timeLimitSeconds: dto.timeLimitSeconds } : {}),
        ...(dto.shuffleQuestions !== undefined ? { shuffleQuestions: dto.shuffleQuestions } : {}),
        ...(dto.shuffleOptions !== undefined ? { shuffleOptions: dto.shuffleOptions } : {}),
      },
    });

    return this.getExam(id);
  }

  /**
   * Content update (questions/options)
   * ATOMICALLY increments contentVersion by 1
   */
  async updateExamContent(id: string, dto: UpdateExamContentBodyDto): Promise<ExamDto> {
    await this.getExam(id); // verify existence
    this.validateQuestions(dto.questions);

    await this.prisma.$transaction(async (tx) => {
      // 1. Increment contentVersion
      await tx.exam.update({
        where: { id },
        data: {
          contentVersion: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      // 2. Delete existing questions and options
      await tx.examQuestion.deleteMany({
        where: { examId: id },
      });

      // 3. Create new questions and options
      for (let i = 0; i < dto.questions.length; i++) {
        const q = dto.questions[i];
        const question = await tx.examQuestion.create({
          data: {
            examId: id,
            type: q.type || QuestionType.MULTIPLE_CHOICE_SINGLE,
            content: q.content.trim(),
            position: q.position ?? i,
          },
        });

        await tx.examOption.createMany({
          data: q.options.map((opt, oIndex) => ({
            questionId: question.id,
            content: opt.content.trim(),
            isCorrect: opt.isCorrect,
            position: opt.position ?? oIndex,
          })),
        });
      }
    });

    this.logger.log(`Exam '${id}' content updated. Incremented contentVersion.`);
    return this.getExam(id);
  }

  async deleteExam(id: string): Promise<{ success: boolean }> {
    await this.getExam(id);
    const now = new Date();

    await this.prisma.exam.update({
      where: { id },
      data: { deletedAt: now },
    });

    return { success: true };
  }

  async duplicateExam(id: string): Promise<ExamDto> {
    const original = await this.getExam(id);

    const duplicated = await this.prisma.$transaction(async (tx) => {
      const newExam = await tx.exam.create({
        data: {
          title: `Copy of ${original.title}`,
          description: original.description,
          folderId: original.folderId,
          coverRef: original.coverRef,
          timeLimitSeconds: original.timeLimitSeconds,
          shuffleQuestions: original.shuffleQuestions,
          shuffleOptions: original.shuffleOptions,
          contentVersion: 1,
        },
      });

      if (original.questions && original.questions.length > 0) {
        for (let i = 0; i < original.questions.length; i++) {
          const q = original.questions[i];
          const newQuestion = await tx.examQuestion.create({
            data: {
              examId: newExam.id,
              type: q.type,
              content: q.content,
              position: q.position,
            },
          });

          await tx.examOption.createMany({
            data: q.options.map((o) => ({
              questionId: newQuestion.id,
              content: o.content,
              isCorrect: o.isCorrect ?? false,
              position: o.position,
            })),
          });
        }
      }

      return newExam;
    });

    return this.getExam(duplicated.id);
  }

  async exportExamToMarkdown(id: string): Promise<{ filename: string; content: string }> {
    const exam = await this.getExam(id);
    const content = exportExamToMarkdown(exam);
    const safeTitle = exam.title.replace(
      /[^a-zA-Z0-9_\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff-]/g,
      '_',
    );
    const filename = `${safeTitle || 'exam'}.md`;
    return { filename, content };
  }
}
