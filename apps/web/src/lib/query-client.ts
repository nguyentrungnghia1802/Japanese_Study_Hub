import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';
import { CACHE_POLICY, MAX_SEARCH_CACHE_KEYS } from './cache-policy';
import type { Query } from '@tanstack/react-query';

function isSearchQuery(query: Query): boolean {
  return query.queryKey[1] === 'search';
}

function trimSearchCache(queryClient: QueryClient): void {
  const searchQueries = queryClient
    .getQueryCache()
    .getAll()
    .filter(isSearchQuery)
    .sort((left, right) => left.state.dataUpdatedAt - right.state.dataUpdatedAt);
  const excess = searchQueries.length - MAX_SEARCH_CACHE_KEYS;
  if (excess <= 0) return;

  for (const query of searchQueries.filter((item) => !item.isActive()).slice(0, excess)) {
    queryClient.removeQueries({ queryKey: query.queryKey, exact: true });
  }
}

export function isRetryableQueryError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return (
      error.status === undefined ||
      error.status === 408 ||
      error.status === 429 ||
      error.status >= 500
    );
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return false;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return false;
  }

  return true;
}

export function queryRetryPolicy(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && isRetryableQueryError(error);
}

export function createStudyQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CACHE_POLICY.dashboardAndLists.staleTime,
        gcTime: CACHE_POLICY.dashboardAndLists.gcTime,
        retry: queryRetryPolicy,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'added' || event.type === 'updated') trimSearchCache(queryClient);
  });
  return queryClient;
}

export const LIVE_ATTEMPT_QUERY_OPTIONS = {
  staleTime: CACHE_POLICY.liveAttempt.staleTime,
  gcTime: CACHE_POLICY.liveAttempt.gcTime,
  retry: false,
  refetchOnReconnect: true,
  refetchOnWindowFocus: true,
  refetchOnMount: false,
} as const;

export interface QueryCacheStats {
  total: number;
  active: number;
  stale: number;
  liveAttempts: number;
  searchQueries: number;
}

export function getQueryCacheStats(queryClient: QueryClient): QueryCacheStats {
  const queries = queryClient.getQueryCache().getAll();
  return {
    total: queries.length,
    active: queries.filter((query) => query.isActive()).length,
    stale: queries.filter((query) => query.isStale()).length,
    liveAttempts: queries.filter((query) => query.queryKey[1] === 'live-attempt').length,
    searchQueries: queries.filter((query) => query.queryKey[1] === 'search').length,
  };
}
