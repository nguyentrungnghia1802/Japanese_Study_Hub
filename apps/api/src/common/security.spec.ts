import { describe, it, expect, vi } from 'vitest';
import { AttemptsService } from '../attempts/attempts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QuestionType, AttemptStatus } from '@japanese-learning/contracts';

describe('API Security Invariants (TASK-111)', () => {
  it('CRITICAL: live attempt payload strictly omits isCorrect and answer metadata', async () => {
    const sampleExam = {
      id: 'exam-secure-1',
      title: 'Security Exam',
      contentVersion: 1,
      timeLimitSeconds: 600,
      shuffleQuestions: false,
      shuffleOptions: false,
      questions: [
        {
          id: 'q-1',
          type: QuestionType.MULTIPLE_CHOICE_SINGLE,
          content: 'Question 1',
          position: 0,
          options: [
            { id: 'opt-1', content: 'Correct Opt', isCorrect: true, position: 0 },
            { id: 'opt-2', content: 'Wrong Opt', isCorrect: false, position: 1 },
          ],
        },
      ],
    };

    const prismaMock = {
      exam: {
        findFirst: vi.fn().mockResolvedValue(sampleExam),
      },
      examAttempt: {
        create: vi.fn().mockResolvedValue({
          id: 'attempt-sec-1',
          examId: 'exam-secure-1',
          examVersion: 1,
          status: AttemptStatus.IN_PROGRESS,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 600000),
          totalQuestions: 1,
          questionOrderSnapshot: { questions: sampleExam.questions },
        }),
      },
    };

    const service = new AttemptsService(prismaMock as unknown as PrismaService);
    const liveAttempt = await service.startAttempt('exam-secure-1');

    // Stringify and parse to verify JSON wire payload
    const serialized = JSON.parse(JSON.stringify(liveAttempt));

    expect(serialized).not.toHaveProperty('answers');
    expect(serialized).not.toHaveProperty('answerKey');
    expect(serialized).not.toHaveProperty('score');

    for (const q of serialized.questions) {
      for (const opt of q.options) {
        expect(opt.isCorrect).toBeUndefined();
      }
    }
  });
});
