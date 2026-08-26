import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { FlashcardSetListItemDto, PaginatedResultDto } from '@japanese-learning/contracts';
import { exportFlashcardSetToMarkdown } from '@japanese-learning/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSetBodyDto } from './dto/create-set.dto.js';
import { UpdateSetBodyDto } from './dto/update-set.dto.js';
import { CreateCardBodyDto } from './dto/create-card.dto.js';
import { UpdateCardBodyDto } from './dto/update-card.dto.js';
import { ReorderCardsBodyDto } from './dto/reorder-cards.dto.js';

@Injectable()
export class FlashcardsService {
  private readonly logger = new Logger(FlashcardsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------
  // SETS CRUD
  // ----------------------------------------------------

  async createSet(dto: CreateSetBodyDto) {
    const set = await this.prisma.flashcardSet.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        coverRef: dto.coverRef?.trim() || null,
      },
      include: {
        _count: {
          select: { cards: { where: { deletedAt: null } } },
        },
      },
    });

    return {
      id: set.id,
      title: set.title,
      description: set.description,
      coverRef: set.coverRef,
      isFavorite: set.isFavorite,
      cardCount: set._count.cards,
      createdAt: set.createdAt.toISOString(),
      updatedAt: set.updatedAt.toISOString(),
    };
  }

  async listSets(options?: {
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    favorite?: boolean;
  }): Promise<PaginatedResultDto<FlashcardSetListItemDto>> {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(options?.search
        ? {
            OR: [
              { title: { contains: options.search, mode: 'insensitive' as const } },
              { description: { contains: options.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(options?.favorite !== undefined ? { isFavorite: options.favorite } : {}),
    };

    const orderBy =
      options?.sort === 'title_asc'
        ? { title: 'asc' as const }
        : options?.sort === 'updatedAt_desc'
          ? { updatedAt: 'desc' as const }
          : { createdAt: 'desc' as const };

    const [total, sets] = await Promise.all([
      this.prisma.flashcardSet.count({ where }),
      this.prisma.flashcardSet.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: {
            select: { cards: { where: { deletedAt: null } } },
          },
        },
      }),
    ]);

    return {
      items: sets.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        coverRef: s.coverRef,
        isFavorite: s.isFavorite,
        cardCount: s._count.cards,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSet(id: string) {
    const set = await this.prisma.flashcardSet.findFirst({
      where: { id, deletedAt: null },
      include: {
        cards: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { cards: { where: { deletedAt: null } } },
        },
      },
    });

    if (!set) {
      throw new NotFoundException(`Flashcard set with ID '${id}' not found`);
    }

    return {
      id: set.id,
      title: set.title,
      description: set.description,
      coverRef: set.coverRef,
      isFavorite: set.isFavorite,
      cardCount: set._count.cards,
      cards: set.cards.map((c) => ({
        id: c.id,
        setId: c.setId,
        front: c.front,
        back: c.back,
        position: c.position,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      createdAt: set.createdAt.toISOString(),
      updatedAt: set.updatedAt.toISOString(),
    };
  }

  async exportSetToMarkdown(id: string): Promise<{ filename: string; content: string }> {
    const set = await this.getSet(id);
    const content = exportFlashcardSetToMarkdown(set);
    const safeTitle = set.title.replace(
      /[^a-zA-Z0-9_\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff-]/g,
      '_',
    );
    const filename = `${safeTitle || 'flashcard_set'}.md`;
    return { filename, content };
  }

  async updateSet(id: string, dto: UpdateSetBodyDto) {
    await this.getSet(id); // verify existence

    const updated = await this.prisma.flashcardSet.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.coverRef !== undefined ? { coverRef: dto.coverRef?.trim() || null } : {}),
      },
      include: {
        _count: {
          select: { cards: { where: { deletedAt: null } } },
        },
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      coverRef: updated.coverRef,
      isFavorite: updated.isFavorite,
      cardCount: updated._count.cards,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteSet(id: string) {
    await this.getSet(id);

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.flashcardSet.update({
        where: { id },
        data: { deletedAt: now },
      }),
      this.prisma.flashcard.updateMany({
        where: { setId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);

    return { success: true, id };
  }

  async setFavorite(id: string, favorite: boolean) {
    await this.getSet(id);
    await this.prisma.flashcardSet.update({
      where: { id },
      data: { isFavorite: favorite },
    });
    return this.getSet(id);
  }

  // ----------------------------------------------------
  // CARDS CRUD (Enforces 1-set-only invariant)
  // ----------------------------------------------------

  async createCard(setId: string, dto: CreateCardBodyDto) {
    await this.getSet(setId);

    let position = dto.position;
    if (position === undefined || position === null) {
      const highestCard = await this.prisma.flashcard.findFirst({
        where: { setId, deletedAt: null },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      position = highestCard ? highestCard.position + 1 : 0;
    }

    const card = await this.prisma.flashcard.create({
      data: {
        setId,
        front: dto.front.trim(),
        back: dto.back.trim(),
        position,
      },
    });

    return {
      id: card.id,
      setId: card.setId,
      front: card.front,
      back: card.back,
      position: card.position,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
  }

  async updateCard(setId: string, cardId: string, dto: UpdateCardBodyDto) {
    const card = await this.prisma.flashcard.findFirst({
      where: { id: cardId, setId, deletedAt: null },
    });

    if (!card) {
      throw new NotFoundException(`Flashcard with ID '${cardId}' not found in set '${setId}'`);
    }

    const updated = await this.prisma.flashcard.update({
      where: { id: cardId },
      data: {
        ...(dto.front !== undefined ? { front: dto.front.trim() } : {}),
        ...(dto.back !== undefined ? { back: dto.back.trim() } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
      },
    });

    return {
      id: updated.id,
      setId: updated.setId,
      front: updated.front,
      back: updated.back,
      position: updated.position,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteCard(setId: string, cardId: string) {
    const card = await this.prisma.flashcard.findFirst({
      where: { id: cardId, setId, deletedAt: null },
    });

    if (!card) {
      throw new NotFoundException(`Flashcard with ID '${cardId}' not found in set '${setId}'`);
    }

    await this.prisma.flashcard.update({
      where: { id: cardId },
      data: { deletedAt: new Date() },
    });

    return { success: true, id: cardId };
  }

  async reorderCards(setId: string, dto: ReorderCardsBodyDto) {
    await this.getSet(setId);

    // Ensure all provided IDs belong to the set
    const existingCards = await this.prisma.flashcard.findMany({
      where: {
        setId,
        id: { in: dto.cardIds },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingCards.length !== dto.cardIds.length) {
      throw new BadRequestException(
        'One or more card IDs are invalid or do not belong to this set',
      );
    }

    // Transactionally update positions
    await this.prisma.$transaction(
      dto.cardIds.map((cardId, index) =>
        this.prisma.flashcard.update({
          where: { id: cardId },
          data: { position: index },
        }),
      ),
    );

    return this.getSet(setId);
  }

  async duplicateSet(id: string) {
    const existing = await this.getSet(id);

    return this.prisma.$transaction(async (tx) => {
      const newSet = await tx.flashcardSet.create({
        data: {
          title: `${existing.title} (Copy)`,
          description: existing.description,
          coverRef: existing.coverRef,
        },
      });

      if (existing.cards.length > 0) {
        await tx.flashcard.createMany({
          data: existing.cards.map((c) => ({
            setId: newSet.id,
            front: c.front,
            back: c.back,
            position: c.position,
          })),
        });
      }

      return {
        id: newSet.id,
        title: newSet.title,
        description: newSet.description,
        coverRef: newSet.coverRef,
        isFavorite: newSet.isFavorite,
        cardCount: existing.cards.length,
        createdAt: newSet.createdAt.toISOString(),
        updatedAt: newSet.updatedAt.toISOString(),
      };
    });
  }

  async duplicateCard(setId: string, cardId: string) {
    const card = await this.prisma.flashcard.findFirst({
      where: { id: cardId, setId, deletedAt: null },
    });

    if (!card) {
      throw new NotFoundException(`Flashcard with ID '${cardId}' not found in set '${setId}'`);
    }

    const highestCard = await this.prisma.flashcard.findFirst({
      where: { setId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const newPosition = highestCard ? highestCard.position + 1 : 0;

    const duplicated = await this.prisma.flashcard.create({
      data: {
        setId,
        front: `${card.front} (Copy)`,
        back: card.back,
        position: newPosition,
      },
    });

    return {
      id: duplicated.id,
      setId: duplicated.setId,
      front: duplicated.front,
      back: duplicated.back,
      position: duplicated.position,
      createdAt: duplicated.createdAt.toISOString(),
      updatedAt: duplicated.updatedAt.toISOString(),
    };
  }
}
