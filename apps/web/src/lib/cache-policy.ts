export const CACHE_POLICY = {
  dashboardAndLists: {
    staleTime: 45_000,
    gcTime: 300_000,
  },
  entityDetail: {
    staleTime: 45_000,
    gcTime: 300_000,
  },
  search: {
    staleTime: 20_000,
    gcTime: 120_000,
  },
  liveAttempt: {
    staleTime: 0,
    gcTime: 0,
  },
} as const;

export const MAX_SEARCH_CACHE_KEYS = 30;
