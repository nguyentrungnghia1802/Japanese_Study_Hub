import { Injectable, Optional } from '@nestjs/common';
import { SearchResultsDto, DashboardSummaryDto, ExamDto } from '@japanese-learning/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import { LearningService } from '../learning/learning.service.js';
import { mapTagRelations } from '../common/tags.js';

type SearchableRecord = {
  id: string;
  updatedAt: Date;
};

function relevanceScore(value: string | null | undefined, query: string, weight: number): number {
  if (!value) return 0;
  const normalizedValue = value.trim().toLocaleLowerCase();
  const normalizedQuery = query.toLocaleLowerCase();
  if (!normalizedValue || !normalizedQuery) return 0;
  if (normalizedValue === normalizedQuery) return 1_000 * weight;
  if (normalizedValue.startsWith(normalizedQuery)) return 700 * weight;
  const matchIndex = normalizedValue.indexOf(normalizedQuery);
  return matchIndex < 0 ? 0 : (500 - Math.min(matchIndex, 100)) * weight;
}

function rankSearchResults<T extends SearchableRecord>(
  items: T[],
  query: string,
  fields: (item: T) => Array<{ value: string | null | undefined; weight: number }>,
): T[] {
  return [...items].sort((left, right) => {
    const leftScore = fields(left).reduce(
      (score, field) => score + relevanceScore(field.value, query, field.weight),
      0,
    );
    const rightScore = fields(right).reduce(
      (score, field) => score + relevanceScore(field.value, query, field.weight),
      0,
    );
    if (leftScore !== rightScore) return rightScore - leftScore;
    const updatedAtDifference = right.updatedAt.getTime() - left.updatedAt.getTime();
    return updatedAtDifference || left.id.localeCompare(right.id);
  });
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly learningService?: LearningService,
  ) {}

  async search(query: string, limit = 20): Promise<SearchResultsDto> {
    const q = query ? query.trim() : '';
    const boundedLimit = Math.min(30, Math.max(1, Number.isFinite(limit) ? limit : 20));
    if (!q) {
      return {
        flashcardSets: [],
        flashcards: [],
        exams: [],
        folders: [],
        total: 0,
      };
    }

    const [sets, cards, exams, folders] = await Promise.all([
      // Flashcard Sets
      this.prisma.flashcardSet.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: boundedLimit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { cards: { where: { deletedAt: null } } },
          },
          tags: {
            include: { tag: { select: { id: true, slug: true, name: true } } },
          },
        },
      }),

      // Individual Flashcards
      this.prisma.flashcard.findMany({
        where: {
          deletedAt: null,
          set: { deletedAt: null },
          OR: [
            { front: { contains: q, mode: 'insensitive' } },
            { back: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: boundedLimit,
        orderBy: { updatedAt: 'desc' },
        include: {
          set: { select: { title: true } },
        },
      }),

      // Exams
      this.prisma.exam.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: boundedLimit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { questions: true } },
          bestResults: { orderBy: { bestScore: 'desc' }, take: 1 },
          tags: {
            include: { tag: { select: { id: true, slug: true, name: true } } },
          },
        },
      }),

      // Exam Folders
      this.prisma.examFolder.findMany({
        where: {
          deletedAt: null,
          name: { contains: q, mode: 'insensitive' },
        },
        take: boundedLimit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { exams: { where: { deletedAt: null } } } },
        },
      }),
    ]);

    const formattedSets = rankSearchResults(sets, q, (set) => [
      { value: set.title, weight: 4 },
      { value: set.description, weight: 1 },
    ]).map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      coverRef: s.coverRef,
      isFavorite: s.isFavorite ?? false,
      tags: mapTagRelations(s.tags),
      cardCount: s._count.cards,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const formattedCards = rankSearchResults(cards, q, (card) => [
      { value: card.front, weight: 3 },
      { value: card.back, weight: 2 },
    ]).map((c) => ({
      id: c.id,
      setId: c.setId,
      setName: c.set.title,
      front: c.front,
      back: c.back,
      position: c.position,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    const formattedExams: ExamDto[] = rankSearchResults(exams, q, (exam) => [
      { value: exam.title, weight: 4 },
      { value: exam.description, weight: 1 },
    ]).map((e) => {
      const best = e.bestResults[0];
      return {
        id: e.id,
        folderId: e.folderId,
        title: e.title,
        description: e.description,
        coverRef: e.coverRef,
        isFavorite: e.isFavorite ?? false,
        tags: mapTagRelations(e.tags),
        timeLimitSeconds: e.timeLimitSeconds,
        contentVersion: e.contentVersion,
        shuffleQuestions: e.shuffleQuestions,
        shuffleOptions: e.shuffleOptions,
        questionCount: e._count.questions,
        bestScore: best ? Number(best.bestScore) : null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      };
    });

    const formattedFolders = rankSearchResults(folders, q, (folder) => [
      { value: folder.name, weight: 4 },
    ]).map((f) => ({
      id: f.id,
      parentId: f.parentId,
      name: f.name,
      position: f.position,
      examCount: f._count.exams,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));

    return {
      flashcardSets: formattedSets,
      flashcards: formattedCards,
      exams: formattedExams,
      folders: formattedFolders,
      total:
        formattedSets.length +
        formattedCards.length +
        formattedExams.length +
        formattedFolders.length,
    };
  }

  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    const [
      recentSets,
      recentExams,
      totalSets,
      totalCards,
      totalExams,
      recentBests,
      recentLearning,
    ] = await Promise.all([
      // 1. Recent Flashcard Sets
      this.prisma.flashcardSet.findMany({
        where: { deletedAt: null },
        take: 4,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { cards: { where: { deletedAt: null } } } },
          tags: {
            include: { tag: { select: { id: true, slug: true, name: true } } },
          },
        },
      }),

      // 2. Recent Exams
      this.prisma.exam.findMany({
        where: { deletedAt: null },
        take: 4,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { questions: true } },
          bestResults: { orderBy: { bestScore: 'desc' }, take: 1 },
          tags: {
            include: { tag: { select: { id: true, slug: true, name: true } } },
          },
        },
      }),

      // 3. Counts
      this.prisma.flashcardSet.count({ where: { deletedAt: null } }),
      this.prisma.flashcard.count({ where: { deletedAt: null, set: { deletedAt: null } } }),
      this.prisma.exam.count({ where: { deletedAt: null } }),

      // 4. Recent Best Scores
      this.prisma.examBestResult.findMany({
        take: 5,
        orderBy: { lastAttemptAt: 'desc' },
        include: {
          exam: { select: { title: true } },
        },
      }),
      this.learningService?.listRecent() ?? Promise.resolve({ items: [] }),
    ]);

    return {
      recentFlashcardSets: recentSets.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        coverRef: s.coverRef,
        isFavorite: s.isFavorite ?? false,
        tags: mapTagRelations(s.tags),
        cardCount: s._count.cards,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      recentExams: recentExams.map((e) => {
        const best = e.bestResults[0];
        return {
          id: e.id,
          folderId: e.folderId,
          title: e.title,
          description: e.description,
          coverRef: e.coverRef,
          isFavorite: e.isFavorite ?? false,
          tags: mapTagRelations(e.tags),
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
      totalFlashcardSets: totalSets,
      totalCards,
      totalExams,
      recentBestScores: recentBests.map((b) => ({
        examId: b.examId,
        examTitle: b.exam.title,
        bestScore: Number(b.bestScore),
        achievedAt: b.achievedAt.toISOString(),
      })),
      recentLearning: recentLearning.items,
    };
  }
}
