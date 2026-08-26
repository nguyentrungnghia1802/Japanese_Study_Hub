import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

export async function invalidateFlashcardQueries(
  queryClient: QueryClient,
  setId?: string,
): Promise<void> {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: queryKeys.flashcardSetsRoot() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.searchRoot() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tags() }),
  ];

  if (setId) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: queryKeys.flashcardSet(setId) }));
  }

  await Promise.all(invalidations);
}

export async function invalidateExamQueries(
  queryClient: QueryClient,
  examId?: string,
  includeFolders = false,
): Promise<void> {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: queryKeys.examsRoot() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.searchRoot() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tags() }),
  ];

  if (examId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.exam(examId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.bestResult(examId) }),
    );
  }

  if (includeFolders) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: queryKeys.examFolders() }));
  }

  await Promise.all(invalidations);
}

export async function invalidateReviewQueries(
  queryClient: QueryClient,
  setId?: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.reviewRoot() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
    ...(setId ? [queryClient.invalidateQueries({ queryKey: queryKeys.flashcardSet(setId) })] : []),
  ]);
}
