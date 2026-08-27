import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AttemptStatus, QuestionType } from '@japanese-learning/contracts';
import { AttemptsService } from '../src/attempts/attempts.service.js';
import { ExamReviewService } from '../src/exam-review/exam-review.service.js';
import { ExamsService } from '../src/exams/exams.service.js';
import { FlashcardsService } from '../src/flashcards/flashcards.service.js';
import { LearningService } from '../src/learning/learning.service.js';
import { ReviewService } from '../src/review/review.service.js';
import { TagService } from '../src/common/tag.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const enabled = process.env.RUN_API_INTEGRATION === '1';
const integration = describe.skipIf(!enabled);

integration('Phase 2 service integration against PostgreSQL', () => {
  let prisma: PrismaService;
  let flashcards: FlashcardsService;
  let exams: ExamsService;
  let learning: LearningService;
  let review: ReviewService;
  let tags: TagService;
  let attempts: AttemptsService;
  let examReview: ExamReviewService;

  const suffix = Date.now().toString(36);
  const setTitle = 'Phase 2 integration set ' + suffix;
  const examTitle = 'Phase 2 integration exam ' + suffix;
  const flashcardTagName = 'Phase2 Integration ' + suffix;
  const examTagName = 'Phase2 Exam Integration ' + suffix;
  let setId = '';
  let cardId = '';
  let examId = '';
  let questionId = '';
  let correctOptionId = '';
  let wrongOptionId = '';
  const tagSlugs: string[] = [];

  beforeAll(async () => {
    if (!enabled) return;
    prisma = new PrismaService();
    await prisma.$connect();
    flashcards = new FlashcardsService(prisma);
    exams = new ExamsService(prisma);
    learning = new LearningService(prisma);
    review = new ReviewService(prisma);
    tags = new TagService(prisma);
    attempts = new AttemptsService(prisma);
    examReview = new ExamReviewService(prisma, attempts);
  });

  afterAll(async () => {
    if (!enabled) return;
    if (examId) {
      await prisma.exam.delete({ where: { id: examId } });
    }
    if (setId) {
      await prisma.flashcardSet.delete({ where: { id: setId } });
    }
    if (tagSlugs.length > 0) {
      await prisma.tag.deleteMany({ where: { slug: { in: tagSlugs } } });
    }
    await prisma.$disconnect();
  });

  it('covers favorites, tags, recent learning, and idempotent FSRS review', async () => {
    const createdSet = await flashcards.createSet({
      title: setTitle,
      description: 'Phase 2 integration data',
    });
    setId = createdSet.id;

    const createdCard = await flashcards.createCard(setId, {
      front: '食べる',
      back: 'to eat',
    });
    cardId = createdCard.id;

    const createdTag = await tags.createTag(flashcardTagName);
    tagSlugs.push(createdTag.slug);
    await flashcards.setFavorite(setId, true);
    const setTags = await tags.replaceFlashcardSetTags(setId, [flashcardTagName]);
    expect(setTags).toHaveLength(1);

    const filtered = await flashcards.listSets({ favorite: true, tag: createdTag.slug });
    expect(filtered.items.some((item) => item.id === setId && item.isFavorite)).toBe(true);

    await flashcards.getSet(setId);
    await learning.touchFlashcardSet(setId);
    const recent = await learning.listRecent(10);
    expect(recent.items.some((item) => item.entityId === setId)).toBe(true);

    const clientRequestId = 'phase2-integration-review-' + suffix;
    const firstReview = await review.submitReview(cardId, {
      rating: 'GOOD',
      clientRequestId,
    });
    const replayedReview = await review.submitReview(cardId, {
      rating: 'GOOD',
      clientRequestId,
    });
    expect(replayedReview).toEqual(firstReview);
    await expect(
      prisma.flashcardReviewLog.count({
        where: { flashcardId: cardId, clientRequestId },
      }),
    ).resolves.toBe(1);
  });

  it('covers official wrong-answer review, sanitized practice, and score isolation', async () => {
    const createdExam = await exams.createExam({
      title: examTitle,
      description: 'Phase 2 integration exam',
      timeLimitSeconds: 60,
      questions: [
        {
          type: QuestionType.MULTIPLE_CHOICE_SINGLE,
          content: 'Which word means to eat?',
          position: 0,
          options: [
            { content: '食べる', isCorrect: true, position: 0 },
            { content: '飲む', isCorrect: false, position: 1 },
          ],
        },
      ],
    });
    examId = createdExam.id;
    const createdQuestion = createdExam.questions?.[0];
    if (!createdQuestion) throw new Error('Integration exam question was not created');
    questionId = createdQuestion.id;
    correctOptionId = createdQuestion.options[0].id;
    wrongOptionId = createdQuestion.options[1].id;

    const createdTag = await tags.createTag(examTagName);
    tagSlugs.push(createdTag.slug);
    await exams.setFavorite(examId, true);
    await tags.replaceExamTags(examId, [examTagName]);
    const filtered = await exams.listExams({ favorite: true, tag: createdTag.slug });
    expect(filtered.items.some((item) => item.id === examId)).toBe(true);

    const live = await attempts.startAttempt(examId);
    expect(live.status).toBe(AttemptStatus.IN_PROGRESS);
    expect(JSON.stringify(live)).not.toMatch(/isCorrect|correctOptionId|answerKey/);

    const submitted = await attempts.submitAttempt(live.attemptId, {
      answers: [{ questionId, selectedOptionId: wrongOptionId }],
    });
    const submittedAttemptIds = [submitted.attemptId];
    expect(submitted.isPractice).toBe(false);
    expect(submitted.score).toBe(0);

    const mistakes = await examReview.getMistakes(examId);
    expect(mistakes.items).toHaveLength(1);
    expect(JSON.stringify(mistakes.items[0])).not.toMatch(/isCorrect|correctOptionId|answerKey/);

    const firstHistory = await examReview.getMistakeAttempts(examId);
    expect(firstHistory.attempts).toHaveLength(1);
    const firstDetail = await examReview.getMistakeAttemptDetail(submitted.attemptId);
    expect(firstDetail.items[0]).toMatchObject({
      questionContent: 'Which word means to eat?',
      selectedOptionId: wrongOptionId,
      correctOptionId,
    });
    expect((await examReview.getFrequentMistakes(examId)).retainedAttemptCount).toBe(1);

    const practice = await examReview.startPractice({
      examId,
      mistakeIds: [mistakes.items[0].id],
    });
    expect(practice.isPractice).toBe(true);
    expect(JSON.stringify(practice)).not.toMatch(/isCorrect|correctOptionId|answerKey/);

    const practiceResult = await attempts.submitAttempt(practice.attemptId, {
      answers: [{ questionId, selectedOptionId: wrongOptionId }],
    });
    expect(practiceResult.isPractice).toBe(true);
    expect(practiceResult.isNewBest).toBe(false);

    for (let index = 0; index < 4; index += 1) {
      const nextAttempt = await attempts.startAttempt(examId);
      const nextResult = await attempts.submitAttempt(nextAttempt.attemptId, {
        answers: [{ questionId, selectedOptionId: wrongOptionId }],
      });
      submittedAttemptIds.push(nextResult.attemptId);
    }

    const retainedHistory = await examReview.getMistakeAttempts(examId);
    expect(retainedHistory.attempts.map((item) => item.attemptId)).toEqual(
      submittedAttemptIds.slice(-3).reverse(),
    );
    await expect(examReview.getMistakeAttemptDetail(submittedAttemptIds[0])).rejects.toThrow();
    expect((await examReview.getFrequentMistakes(examId)).retainedAttemptCount).toBe(3);
    await expect(prisma.examMistake.count({ where: { examId } })).resolves.toBe(3);
    const bestResult = await prisma.examBestResult.findFirst({ where: { examId } });
    expect(bestResult?.attemptCount).toBe(5);
    await expect(prisma.examBestResult.count({ where: { examId } })).resolves.toBe(1);
    expect(correctOptionId).not.toBe(wrongOptionId);
  });
});
