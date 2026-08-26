import { Injectable } from '@nestjs/common';
import {
  RecentLearningItemDto,
  RecentLearningKind,
  RecentLearningResponseDto,
} from '@japanese-learning/contracts';
import { PrismaService } from '../prisma/prisma.service.js';

export const PRIMARY_USER_KEY = 'primary_user';
export const MAX_RECENT_STORAGE_ITEMS = 20;
export const MAX_RECENT_RESPONSE_ITEMS = 10;

type RecentRow = {
  id: string;
  kind: RecentLearningKind;
  entityId: string;
  lastAccessedAt: Date;
};

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  async touch(kind: RecentLearningKind, entityId: string, now = new Date()): Promise<void> {
    await this.prisma.recentLearning.upsert({
      where: {
        userKey_kind_entityId: {
          userKey: PRIMARY_USER_KEY,
          kind,
          entityId,
        },
      },
      create: {
        userKey: PRIMARY_USER_KEY,
        kind,
        entityId,
        lastAccessedAt: now,
      },
      update: { lastAccessedAt: now },
    });

    const overflow = await this.prisma.recentLearning.findMany({
      where: { userKey: PRIMARY_USER_KEY },
      orderBy: [{ lastAccessedAt: 'desc' }, { id: 'desc' }],
      skip: MAX_RECENT_STORAGE_ITEMS,
      take: MAX_RECENT_STORAGE_ITEMS,
      select: { id: true },
    });

    if (overflow.length > 0) {
      await this.prisma.recentLearning.deleteMany({
        where: { id: { in: overflow.map((row) => row.id) } },
      });
    }
  }

  touchFlashcardSet(entityId: string, now?: Date) {
    return this.touch('FLASHCARD_SET', entityId, now);
  }

  touchExam(entityId: string, now?: Date) {
    return this.touch('EXAM', entityId, now);
  }

  async listRecent(limit = MAX_RECENT_RESPONSE_ITEMS): Promise<RecentLearningResponseDto> {
    const boundedLimit = Math.min(MAX_RECENT_RESPONSE_ITEMS, Math.max(1, Math.floor(limit)));
    const rows = (await this.prisma.recentLearning.findMany({
      where: { userKey: PRIMARY_USER_KEY },
      orderBy: [{ lastAccessedAt: 'desc' }, { id: 'desc' }],
      take: MAX_RECENT_STORAGE_ITEMS,
      select: { id: true, kind: true, entityId: true, lastAccessedAt: true },
    })) as RecentRow[];

    const setIds = rows.filter((row) => row.kind === 'FLASHCARD_SET').map((row) => row.entityId);
    const examIds = rows.filter((row) => row.kind === 'EXAM').map((row) => row.entityId);
    const [sets, exams] = await Promise.all([
      setIds.length
        ? this.prisma.flashcardSet.findMany({
            where: { id: { in: setIds }, deletedAt: null },
            select: {
              id: true,
              title: true,
              description: true,
              _count: { select: { cards: { where: { deletedAt: null } } } },
            },
          })
        : [],
      examIds.length
        ? this.prisma.exam.findMany({
            where: { id: { in: examIds }, deletedAt: null },
            select: {
              id: true,
              title: true,
              description: true,
              _count: { select: { questions: true } },
            },
          })
        : [],
    ]);

    const setById = new Map(sets.map((set) => [set.id, set]));
    const examById = new Map(exams.map((exam) => [exam.id, exam]));
    const items: RecentLearningItemDto[] = [];

    for (const row of rows) {
      if (items.length >= boundedLimit) break;

      if (row.kind === 'FLASHCARD_SET') {
        const set = setById.get(row.entityId);
        if (!set) continue;
        items.push({
          kind: row.kind,
          entityId: set.id,
          title: set.title,
          subtitle: set.description,
          cardCount: set._count.cards,
          lastAccessedAt: row.lastAccessedAt.toISOString(),
          href: `/flashcards/${set.id}/study`,
        });
      } else {
        const exam = examById.get(row.entityId);
        if (!exam) continue;
        items.push({
          kind: row.kind,
          entityId: exam.id,
          title: exam.title,
          subtitle: exam.description,
          questionCount: exam._count.questions,
          lastAccessedAt: row.lastAccessedAt.toISOString(),
          href: `/exams/${exam.id}/take`,
        });
      }
    }

    return { items };
  }
}
