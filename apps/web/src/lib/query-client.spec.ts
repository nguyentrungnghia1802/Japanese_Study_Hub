import { describe, expect, it } from 'vitest';
import { ApiError } from './api-client.js';
import { CACHE_POLICY } from './cache-policy.js';
import {
  invalidateExamQueries,
  invalidateFlashcardQueries,
  invalidateReviewQueries,
} from './query-invalidation.js';
import {
  createStudyQueryClient,
  getQueryCacheStats,
  isRetryableQueryError,
} from './query-client.js';
import { queryKeys } from './query-keys.js';

describe('Web query policy', () => {
  it('retries network and server failures but never client validation failures', () => {
    expect(isRetryableQueryError(new Error('network down'))).toBe(true);
    expect(isRetryableQueryError(new ApiError('BAD_REQUEST', 'invalid', null, 400))).toBe(false);
    expect(isRetryableQueryError(new ApiError('SERVER_ERROR', 'server', null, 503))).toBe(true);
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    expect(isRetryableQueryError(abortError)).toBe(false);
  });

  it('uses bounded memory-only defaults and deduplicates concurrent reads', async () => {
    const queryClient = createStudyQueryClient();
    const defaults = queryClient.getDefaultOptions().queries;
    expect(defaults?.staleTime).toBe(CACHE_POLICY.dashboardAndLists.staleTime);
    expect(defaults?.gcTime).toBe(CACHE_POLICY.dashboardAndLists.gcTime);
    expect(queryClient.getDefaultOptions().queries?.persister).toBeUndefined();

    let calls = 0;
    const queryFn = async () => {
      calls += 1;
      return { value: 'shared' };
    };
    const key = queryKeys.dashboard();
    await Promise.all([
      queryClient.fetchQuery({ queryKey: key, queryFn }),
      queryClient.fetchQuery({ queryKey: key, queryFn }),
    ]);
    expect(calls).toBe(1);
    expect(getQueryCacheStats(queryClient).total).toBe(1);
  });

  it('reuses warm list and detail data across a list-to-detail-to-list navigation', async () => {
    const queryClient = createStudyQueryClient();
    let listCalls = 0;
    let detailCalls = 0;
    const listKey = queryKeys.flashcardSets({ page: 1 });
    const detailKey = queryKeys.flashcardSet('set-1');

    await queryClient.fetchQuery({
      queryKey: listKey,
      queryFn: async () => {
        listCalls += 1;
        return [{ id: 'set-1' }];
      },
    });
    await queryClient.fetchQuery({
      queryKey: detailKey,
      queryFn: async () => {
        detailCalls += 1;
        return { id: 'set-1', title: 'N5' };
      },
    });
    await queryClient.fetchQuery({
      queryKey: listKey,
      queryFn: async () => {
        listCalls += 1;
        return [{ id: 'set-1' }];
      },
    });
    await queryClient.fetchQuery({
      queryKey: detailKey,
      queryFn: async () => {
        detailCalls += 1;
        return { id: 'set-1', title: 'N5' };
      },
    });

    expect(listCalls).toBe(1);
    expect(detailCalls).toBe(1);
  });

  it('revalidates stale data and retries one recoverable read failure', async () => {
    const queryClient = createStudyQueryClient();
    let staleCalls = 0;
    const staleKey = queryKeys.dashboard();

    await queryClient.fetchQuery({
      queryKey: staleKey,
      queryFn: async () => {
        staleCalls += 1;
        return { version: staleCalls };
      },
      staleTime: 0,
    });
    await queryClient.fetchQuery({
      queryKey: staleKey,
      queryFn: async () => {
        staleCalls += 1;
        return { version: staleCalls };
      },
      staleTime: 0,
    });
    expect(staleCalls).toBe(2);

    let retryCalls = 0;
    const retryResult = await queryClient.fetchQuery({
      queryKey: queryKeys.search('recoverable'),
      queryFn: async () => {
        retryCalls += 1;
        if (retryCalls === 1) throw new Error('temporary network failure');
        return { total: 1 };
      },
      retry: 1,
      retryDelay: 0,
    });

    expect(retryCalls).toBe(2);
    expect(retryResult).toEqual({ total: 1 });
  });

  it('bounds short-lived search query cardinality', () => {
    const queryClient = createStudyQueryClient();

    for (let index = 0; index < 35; index += 1) {
      queryClient.setQueryData(queryKeys.search(`query-${index}`), { total: index });
    }

    expect(getQueryCacheStats(queryClient).searchQueries).toBeLessThanOrEqual(30);
  });

  it('invalidates the affected domain without clearing unrelated data', async () => {
    const queryClient = createStudyQueryClient();
    await queryClient.fetchQuery({ queryKey: queryKeys.flashcardSets(), queryFn: async () => [] });
    await queryClient.fetchQuery({ queryKey: queryKeys.exams(), queryFn: async () => [] });

    await invalidateFlashcardQueries(queryClient);

    expect(
      queryClient.getQueryCache().find({ queryKey: queryKeys.flashcardSets() })?.state
        .isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryCache().find({ queryKey: queryKeys.exams() })?.state.isInvalidated,
    ).toBe(false);
  });

  it('invalidates official exam result reads after submission', async () => {
    const queryClient = createStudyQueryClient();
    const examId = '77777777-7777-4777-8777-777777777777';
    await queryClient.fetchQuery({ queryKey: queryKeys.exam(examId), queryFn: async () => ({}) });
    await queryClient.fetchQuery({
      queryKey: queryKeys.bestResult(examId),
      queryFn: async () => ({ bestScore: 80 }),
    });
    await queryClient.fetchQuery({ queryKey: queryKeys.dashboard(), queryFn: async () => ({}) });

    await invalidateExamQueries(queryClient, examId);

    expect(
      queryClient.getQueryCache().find({ queryKey: queryKeys.exam(examId) })?.state.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryCache().find({ queryKey: queryKeys.bestResult(examId) })?.state
        .isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryCache().find({ queryKey: queryKeys.dashboard() })?.state.isInvalidated,
    ).toBe(true);
  });

  it('invalidates review and dashboard reads after a rating', async () => {
    const queryClient = createStudyQueryClient();
    await queryClient.fetchQuery({
      queryKey: queryKeys.reviewQueue(20),
      queryFn: async () => ({ cards: [] }),
    });
    await queryClient.fetchQuery({
      queryKey: queryKeys.reviewSummary(),
      queryFn: async () => ({ dueCount: 0, newCount: 0 }),
    });
    await queryClient.fetchQuery({ queryKey: queryKeys.dashboard(), queryFn: async () => ({}) });

    await invalidateReviewQueries(queryClient);

    expect(
      queryClient.getQueryCache().find({ queryKey: queryKeys.reviewQueue(20) })?.state
        .isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryCache().find({ queryKey: queryKeys.reviewSummary() })?.state
        .isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryCache().find({ queryKey: queryKeys.dashboard() })?.state.isInvalidated,
    ).toBe(true);
  });
});
