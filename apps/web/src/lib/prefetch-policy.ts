export const TARGETED_PREFETCH_LIMIT = 24;

const prefetchedRoutes = new Set<string>();

export function shouldPrefetchRoute(href: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  if (/\/exams\/[^/]+\/take(?:\?|$)/.test(href)) return false;
  if (prefetchedRoutes.has(href) || prefetchedRoutes.size >= TARGETED_PREFETCH_LIMIT) return false;

  prefetchedRoutes.add(href);
  return true;
}

export function resetPrefetchBudget(): void {
  prefetchedRoutes.clear();
}
