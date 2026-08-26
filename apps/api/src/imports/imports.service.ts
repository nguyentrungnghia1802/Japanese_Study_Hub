import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  DuplicatePolicy,
  ImportType,
  FlashcardImportPreviewResponseDto,
  FlashcardSetResponseDto,
  ExamImportPreviewResponseDto,
  ExamDto,
  CreateExamQuestionDto,
} from '@japanese-learning/contracts';
import { parseFlashcardMarkdown, parseExamMarkdown } from '@japanese-learning/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConfirmFlashcardsBodyDto } from './dto/confirm-flashcards.dto.js';
import { ConfirmExamBodyDto } from './dto/confirm-exam.dto.js';

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async previewFlashcards(rawContent: string): Promise<FlashcardImportPreviewResponseDto> {
    if (!rawContent || !rawContent.trim()) {
      throw new BadRequestException('Import content cannot be empty');
    }

    const parseResult = parseFlashcardMarkdown(rawContent);

    const warnings = parseResult.issues.filter((i) => i.severity === 'WARNING');
    const errors = parseResult.issues.filter((i) => i.severity === 'ERROR');

    const title = parseResult.data?.title || 'Untitled Set';
    const description = parseResult.data?.description || null;
    const cards = parseResult.data?.cards || [];

    const preview = {
      title,
      description,
      cardCount: cards.length,
      cards: cards.map((c, idx) => ({
        number: idx + 1,
        front: c.front,
        back: c.back,
      })),
      warnings,
      errors,
    };

    const payloadHash = crypto.createHash('sha256').update(rawContent).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

    const session = await this.prisma.importSession.create({
      data: {
        type: ImportType.FLASHCARD_SET,
        payloadHash,
        normalizedPayload: {
          title,
          description,
          cards,
          hasErrors: errors.length > 0,
        },
        expiresAt,
      },
    });

    return {
      importToken: session.id,
      expiresAt: expiresAt.toISOString(),
      preview,
    };
  }

  async confirmFlashcards(dto: ConfirmFlashcardsBodyDto): Promise<FlashcardSetResponseDto> {
    const session = await this.prisma.importSession.findFirst({
      where: { id: dto.importToken },
    });

    if (!session) {
      throw new NotFoundException('Import session not found or invalid token');
    }

    if (session.consumedAt) {
      throw new BadRequestException('Import session has already been consumed');
    }

    if (new Date() > session.expiresAt) {
      throw new BadRequestException('Import session has expired. Please upload and preview again.');
    }

    if (session.type !== ImportType.FLASHCARD_SET) {
      throw new BadRequestException('Import session type mismatch');
    }

    const payload = session.normalizedPayload as {
      title: string;
      description: string | null;
      cards: Array<{ front: string; back: string; position: number }>;
      hasErrors?: boolean;
    };

    if (payload.hasErrors || payload.cards.length === 0) {
      throw new BadRequestException('Cannot confirm import session with blocking syntax errors');
    }

    const duplicatePolicy = dto.duplicatePolicy || DuplicatePolicy.RENAME;
    let targetTitle = payload.title;

    const existingSet = await this.prisma.flashcardSet.findFirst({
      where: {
        title: targetTitle,
        deletedAt: null,
      },
    });

    if (existingSet) {
      if (duplicatePolicy === DuplicatePolicy.REJECT) {
        throw new ConflictException(`A flashcard set named '${targetTitle}' already exists`);
      }

      if (duplicatePolicy === DuplicatePolicy.RENAME) {
        let suffix = 1;
        while (
          await this.prisma.flashcardSet.findFirst({
            where: { title: `${targetTitle} (${suffix})`, deletedAt: null },
          })
        ) {
          suffix++;
        }
        targetTitle = `${targetTitle} (${suffix})`;
      }
    }

    const createdOrUpdatedSet = await this.prisma.$transaction(async (tx) => {
      let setId: string;

      if (existingSet && duplicatePolicy === DuplicatePolicy.OVERWRITE) {
        setId = existingSet.id;
        await tx.flashcard.deleteMany({
          where: { setId },
        });

        await tx.flashcardSet.update({
          where: { id: setId },
          data: {
            description: payload.description,
            updatedAt: new Date(),
          },
        });
      } else {
        const newSet = await tx.flashcardSet.create({
          data: {
            title: targetTitle,
            description: payload.description,
          },
        });
        setId = newSet.id;
      }

      await tx.flashcard.createMany({
        data: payload.cards.map((c, index) => ({
          setId,
          front: c.front,
          back: c.back,
          position: index,
        })),
      });

      await tx.importSession.update({
        where: { id: session.id },
        data: { consumedAt: new Date() },
      });

      const finalSet = await tx.flashcardSet.findUniqueOrThrow({
        where: { id: setId },
        include: {
          _count: {
            select: { cards: { where: { deletedAt: null } } },
          },
        },
      });

      return {
        id: finalSet.id,
        title: finalSet.title,
        description: finalSet.description,
        coverRef: finalSet.coverRef,
        isFavorite: finalSet.isFavorite ?? false,
        cardCount: finalSet._count.cards,
        createdAt: finalSet.createdAt.toISOString(),
        updatedAt: finalSet.updatedAt.toISOString(),
      };
    });

    this.logger.log(
      `Successfully imported flashcard set '${createdOrUpdatedSet.title}' (${createdOrUpdatedSet.cardCount} cards)`,
    );
    return createdOrUpdatedSet;
  }

  async previewExam(rawContent: string): Promise<ExamImportPreviewResponseDto> {
    if (!rawContent || !rawContent.trim()) {
      throw new BadRequestException('Import content cannot be empty');
    }

    const parseResult = parseExamMarkdown(rawContent);

    const warnings = parseResult.issues.filter((i) => i.severity === 'WARNING');
    const errors = parseResult.issues.filter((i) => i.severity === 'ERROR');

    const title = parseResult.data?.title || 'Untitled Exam';
    const description = parseResult.data?.description || null;
    const timeLimitSeconds = parseResult.data?.timeLimitSeconds ?? null;
    const timeLimitMinutes = timeLimitSeconds ? Math.round(timeLimitSeconds / 60) : null;
    const shuffleQuestions = parseResult.data?.shuffleQuestions ?? false;
    const shuffleOptions = parseResult.data?.shuffleOptions ?? false;
    const questions = parseResult.data?.questions || [];
    const totalOptions = questions.reduce((acc, q) => acc + q.options.length, 0);

    const preview = {
      metadata: {
        title,
        description,
        timeLimitMinutes,
        shuffleQuestions,
        shuffleOptions,
        questionCount: questions.length,
        optionCount: totalOptions,
      },
      questions,
      warnings,
      errors,
    };

    const payloadHash = crypto.createHash('sha256').update(rawContent).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

    const session = await this.prisma.importSession.create({
      data: {
        type: ImportType.EXAM,
        payloadHash,
        normalizedPayload: JSON.parse(
          JSON.stringify({
            title,
            description,
            timeLimitSeconds,
            shuffleQuestions,
            shuffleOptions,
            questions,
            hasErrors: errors.length > 0,
          }),
        ),
        expiresAt,
      },
    });

    return {
      importToken: session.id,
      expiresAt: expiresAt.toISOString(),
      preview,
    };
  }

  async confirmExam(dto: ConfirmExamBodyDto): Promise<ExamDto> {
    const session = await this.prisma.importSession.findFirst({
      where: { id: dto.importToken },
    });

    if (!session) {
      throw new NotFoundException('Import session not found or invalid token');
    }

    if (session.consumedAt) {
      throw new BadRequestException('Import session has already been consumed');
    }

    if (new Date() > session.expiresAt) {
      throw new BadRequestException('Import session has expired. Please upload and preview again.');
    }

    if (session.type !== ImportType.EXAM) {
      throw new BadRequestException('Import session type mismatch (expected EXAM)');
    }

    const payload = session.normalizedPayload as unknown as {
      title: string;
      description: string | null;
      timeLimitSeconds: number | null;
      shuffleQuestions: boolean;
      shuffleOptions: boolean;
      questions: CreateExamQuestionDto[];
      hasErrors?: boolean;
    };

    if (payload.hasErrors || payload.questions.length === 0) {
      throw new BadRequestException('Cannot confirm import session with blocking syntax errors');
    }

    if (dto.folderId) {
      const folder = await this.prisma.examFolder.findFirst({
        where: { id: dto.folderId, deletedAt: null },
      });
      if (!folder) {
        throw new NotFoundException(`Folder with ID '${dto.folderId}' not found`);
      }
    }

    const duplicatePolicy = dto.duplicatePolicy || DuplicatePolicy.RENAME;
    let targetTitle = payload.title;

    const existingExam = await this.prisma.exam.findFirst({
      where: {
        title: targetTitle,
        folderId: dto.folderId || null,
        deletedAt: null,
      },
    });

    if (existingExam) {
      if (duplicatePolicy === DuplicatePolicy.REJECT) {
        throw new ConflictException(`An exam named '${targetTitle}' already exists in this folder`);
      }

      if (duplicatePolicy === DuplicatePolicy.RENAME) {
        let suffix = 1;
        while (
          await this.prisma.exam.findFirst({
            where: {
              title: `${targetTitle} (${suffix})`,
              folderId: dto.folderId || null,
              deletedAt: null,
            },
          })
        ) {
          suffix++;
        }
        targetTitle = `${targetTitle} (${suffix})`;
      }
    }

    // Execute atomic write transaction
    const finalExam = await this.prisma.$transaction(async (tx) => {
      let examId: string;

      if (existingExam && duplicatePolicy === DuplicatePolicy.OVERWRITE) {
        examId = existingExam.id;

        await tx.examQuestion.deleteMany({
          where: { examId },
        });

        await tx.exam.update({
          where: { id: examId },
          data: {
            description: payload.description,
            timeLimitSeconds: payload.timeLimitSeconds,
            shuffleQuestions: payload.shuffleQuestions,
            shuffleOptions: payload.shuffleOptions,
            contentVersion: { increment: 1 },
            updatedAt: new Date(),
          },
        });
      } else {
        const created = await tx.exam.create({
          data: {
            title: targetTitle,
            description: payload.description,
            folderId: dto.folderId || null,
            timeLimitSeconds: payload.timeLimitSeconds,
            shuffleQuestions: payload.shuffleQuestions,
            shuffleOptions: payload.shuffleOptions,
            contentVersion: 1,
          },
        });
        examId = created.id;
      }

      // Create questions & options
      for (let i = 0; i < payload.questions.length; i++) {
        const q = payload.questions[i];
        const question = await tx.examQuestion.create({
          data: {
            examId,
            type: q.type,
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

      // Mark session consumed
      await tx.importSession.update({
        where: { id: session.id },
        data: { consumedAt: new Date() },
      });

      return tx.exam.findUniqueOrThrow({
        where: { id: examId },
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
    });

    this.logger.log(
      `Successfully imported exam '${finalExam.title}' (${finalExam.questions.length} questions)`,
    );

    return {
      id: finalExam.id,
      folderId: finalExam.folderId,
      title: finalExam.title,
      description: finalExam.description,
      coverRef: finalExam.coverRef,
      isFavorite: finalExam.isFavorite ?? false,
      timeLimitSeconds: finalExam.timeLimitSeconds,
      contentVersion: finalExam.contentVersion,
      shuffleQuestions: finalExam.shuffleQuestions,
      shuffleOptions: finalExam.shuffleOptions,
      questionCount: finalExam.questions.length,
      bestScore: null,
      createdAt: finalExam.createdAt.toISOString(),
      updatedAt: finalExam.updatedAt.toISOString(),
    };
  }
}
