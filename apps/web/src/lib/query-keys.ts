export interface FlashcardListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  favorite?: boolean;
  tag?: string;
}

export interface ExamListQuery {
  folderId?: string | null;
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  favorite?: boolean;
  tag?: string;
}

const root = ['study-hub'] as const;

export const queryKeys = {
  root,
  dashboard: () => [...root, 'dashboard'] as const,
  recentLearning: (limit = 10) => [...root, 'recent-learning', { limit }] as const,
  flashcardSetsRoot: () => [...root, 'flashcard-sets'] as const,
  flashcardSets: (query: FlashcardListQuery = {}) => [...root, 'flashcard-sets', query] as const,
  flashcardSet: (setId: string) => [...root, 'flashcard-set', setId] as const,
  tags: () => [...root, 'tags'] as const,
  examFolders: () => [...root, 'exam-folders'] as const,
  examsRoot: () => [...root, 'exams'] as const,
  exams: (query: ExamListQuery = {}) => [...root, 'exams', query] as const,
  exam: (examId: string) => [...root, 'exam', examId] as const,
  bestResult: (examId: string) => [...root, 'exam', examId, 'best-result'] as const,
  searchRoot: () => [...root, 'search'] as const,
  search: (query: string, limit = 30) => [...root, 'search', { query, limit }] as const,
  liveAttempt: (attemptId: string) => [...root, 'live-attempt', attemptId] as const,
  submittedAttemptResult: (attemptId: string) => [...root, 'submitted-attempt-result', attemptId] as const,
  reviewRoot: () => [...root, 'review'] as const,
  reviewQueue: (limit = 20) => [...root, 'review', 'queue', { limit }] as const,
  reviewSummary: () => [...root, 'review', 'summary'] as const,
  mistakesRoot: () => [...root, 'exam-mistakes'] as const,
  mistakes: (limit = 20) => [...root, 'exam-mistakes', { limit }] as const,
  dictionaryRoot: () => [...root, 'dictionary'] as const,
  dictionaryLookup: (query: string, direction: string, limit = 20, includeExamples = false) =>
    [...root, 'dictionary', 'lookup', { query, direction, limit, includeExamples }] as const,
  dictionarySuggestions: (query: string, direction: string, limit = 10) =>
    [...root, 'dictionary', 'suggestions', { query, direction, limit }] as const,
  dictionaryHistory: (limit = 10) => [...root, 'dictionary', 'history', { limit }] as const,
  dictionaryFavorites: (limit = 20, offset = 0) =>
    [...root, 'dictionary', 'favorites', { limit, offset }] as const,
};
