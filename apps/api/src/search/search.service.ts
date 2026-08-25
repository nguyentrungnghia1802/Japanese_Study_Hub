import { Injectable } from '@nestjs/common';
import { SearchResultsDto, DashboardSummaryDto, ExamDto } from '@japanese-learning/contracts';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, limit = 20): Promise<SearchResultsDto> {
    const q = query ? query.trim() : '';
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
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { cards: { where: { deletedAt: null } } },
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
        take: limit,
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
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { questions: true } },
          bestResults: { orderBy: { bestScore: 'desc' }, take: 1 },
        },
      }),

      // Exam Folders
      this.prisma.examFolder.findMany({
        where: {
          deletedAt: null,
          name: { contains: q, mode: 'insensitive' },
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { exams: { where: { deletedAt: null } } } },
        },
      }),
    ]);

    const formattedSets = sets.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      coverRef: s.coverRef,
      cardCount: s._count.cards,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const formattedCards = cards.map((c) => ({
      id: c.id,
      setId: c.setId,
      setName: c.set.title,
      front: c.front,
      back: c.back,
      position: c.position,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    const formattedExams: ExamDto[] = exams.map((e) => {
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
    });

    const formattedFolders = folders.map((f) => ({
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
    const [recentSets, recentExams, totalSets, totalCards, totalExams, recentBests] =
      await Promise.all([
        // 1. Recent Flashcard Sets
        this.prisma.flashcardSet.findMany({
          where: { deletedAt: null },
          take: 4,
          orderBy: { updatedAt: 'desc' },
          include: {
            _count: { select: { cards: { where: { deletedAt: null } } } },
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
      ]);

    return {
      recentFlashcardSets: recentSets.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        coverRef: s.coverRef,
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
    };
  }
}
