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
} from '@japanese-learning/contracts';
import { parseFlashcardMarkdown } from '@japanese-learning/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConfirmFlashcardsBodyDto } from './dto/confirm-flashcards.dto.js';

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

    // Calculate SHA-256 hash of payload
    const payloadHash = crypto.createHash('sha256').update(rawContent).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

    // Store in import_sessions
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

    // Check for existing sets with the same title
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

    // Execute atomic write transaction
    const createdOrUpdatedSet = await this.prisma.$transaction(async (tx) => {
      let setId: string;

      if (existingSet && duplicatePolicy === DuplicatePolicy.OVERWRITE) {
        setId = existingSet.id;
        // Soft delete or delete previous cards
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

      // Create cards
      await tx.flashcard.createMany({
        data: payload.cards.map((c, index) => ({
          setId,
          front: c.front,
          back: c.back,
          position: index,
        })),
      });

      // Mark session as consumed
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
}
