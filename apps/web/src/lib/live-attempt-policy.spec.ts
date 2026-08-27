import { afterEach, describe, expect, it, vi } from 'vitest';
import { AttemptStatus, QuestionType, LiveExamAttemptDto } from '@japanese-learning/contracts';
import { LIVE_ATTEMPT_QUERY_OPTIONS, createStudyQueryClient } from './query-client.js';
import {
  clearActiveAttemptId,
  clearExamAttemptPending,
  getServerRemainingSeconds,
  hasAnyActiveExamAttempt,
  MAX_ACTIVE_ATTEMPT_INDEX,
  markExamAttemptPending,
  writeActiveAttemptId,
} from './live-attempt-policy.js';
import { queryKeys } from './query-keys.js';
import { assertLiveAttemptPayload } from './study-api.js';

const safeAttempt: LiveExamAttemptDto = {
  attemptId: '11111111-1111-4111-8111-111111111111',
  examId: '22222222-2222-4222-8222-222222222222',
  examTitle: 'JLPT practice',
  examVersion: 1,
  timeLimitSeconds: 60,
  startedAt: '2026-08-26T00:00:00.000Z',
  expiresAt: '2026-08-26T00:01:30.000Z',
  status: AttemptStatus.IN_PROGRESS,
  totalQuestions: 1,
  questions: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      type: QuestionType.MULTIPLE_CHOICE_SINGLE,
      content: 'Choose the correct reading.',
      position: 0,
      options: [
        { id: '44444444-4444-4444-8444-444444444444', content: 'A', position: 0 },
        { id: '55555555-5555-4555-8555-555555555555', content: 'B', position: 1 },
      ],
    },
  ],
  savedAnswers: {},
};

describe('live attempt safety and freshness policy', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('recomputes the timer from the server expiry after restore', () => {
    const now = Date.parse('2026-08-26T00:00:00.000Z');
    expect(getServerRemainingSeconds(safeAttempt.expiresAt, now)).toBe(90);
    expect(getServerRemainingSeconds(safeAttempt.expiresAt, now + 91_000)).toBe(0);
    expect(getServerRemainingSeconds(null, now)).toBeNull();
  });

  it('uses zero-stale, non-persistent live-attempt query settings', () => {
    expect(LIVE_ATTEMPT_QUERY_OPTIONS.staleTime).toBe(0);
    expect(LIVE_ATTEMPT_QUERY_OPTIONS.gcTime).toBe(0);
    expect(LIVE_ATTEMPT_QUERY_OPTIONS.refetchOnReconnect).toBe(true);
    expect(LIVE_ATTEMPT_QUERY_OPTIONS.refetchOnWindowFocus).toBe(true);
  });

  it('rejects correctness metadata before a live payload can enter query cache', async () => {
    const queryClient = createStudyQueryClient();
    const safeKey = queryKeys.liveAttempt(safeAttempt.attemptId);
    await queryClient.fetchQuery({
      queryKey: safeKey,
      queryFn: async () => assertLiveAttemptPayload(safeAttempt),
    });
    expect(queryClient.getQueryData(safeKey)).toEqual(safeAttempt);

    const leakedPayload = {
      ...safeAttempt,
      questions: [
        {
          ...safeAttempt.questions[0],
          options: [{ ...safeAttempt.questions[0].options[0], isCorrect: true }],
        },
      ],
    } as unknown as LiveExamAttemptDto;
    const leakedKey = queryKeys.liveAttempt('66666666-6666-4666-8666-666666666666');

    await expect(
      queryClient.fetchQuery({
        queryKey: leakedKey,
        queryFn: async () => assertLiveAttemptPayload(leakedPayload),
      }),
    ).rejects.toThrow('forbidden correctness metadata');
    expect(queryClient.getQueryData(leakedKey)).toBeUndefined();
  });

  it('keeps the active-attempt lookup gate bounded and clears it after finalization', () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        sessionStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
          removeItem: (key: string) => values.delete(key),
        },
        dispatchEvent: vi.fn(),
      },
    });
    const examId = '77777777-7777-4777-8777-777777777777';
    const attemptId = '88888888-8888-4888-8888-888888888888';

    markExamAttemptPending(examId);
    expect(hasAnyActiveExamAttempt()).toBe(true);
    writeActiveAttemptId(examId, attemptId);
    expect(hasAnyActiveExamAttempt()).toBe(true);
    clearActiveAttemptId(examId);
    clearExamAttemptPending(examId);
    expect(hasAnyActiveExamAttempt()).toBe(false);
  });

  it('removes evicted active-attempt markers instead of accumulating session keys', () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        sessionStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
          removeItem: (key: string) => values.delete(key),
        },
        dispatchEvent: vi.fn(),
      },
    });

    for (let index = 0; index < MAX_ACTIVE_ATTEMPT_INDEX + 3; index += 1) {
      writeActiveAttemptId(
        `00000000-0000-4000-8000-${(2000 + index).toString(16).padStart(12, '0')}`,
        `00000000-0000-4000-8000-${(3000 + index).toString(16).padStart(12, '0')}`,
      );
    }

    const markerCount = [...values.keys()].filter((key) =>
      key.startsWith('jsh_active_attempt_v1:'),
    ).length;
    expect(markerCount).toBe(MAX_ACTIVE_ATTEMPT_INDEX);
  });
});
