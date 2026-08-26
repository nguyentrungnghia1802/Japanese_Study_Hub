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
  examFolders: () => [...root, 'exam-folders'] as const,
  examsRoot: () => [...root, 'exams'] as const,
  exams: (query: ExamListQuery = {}) => [...root, 'exams', query] as const,
  exam: (examId: string) => [...root, 'exam', examId] as const,
  bestResult: (examId: string) => [...root, 'exam', examId, 'best-result'] as const,
  searchRoot: () => [...root, 'search'] as const,
  search: (query: string, limit = 30) => [...root, 'search', { query, limit }] as const,
  liveAttempt: (attemptId: string) => [...root, 'live-attempt', attemptId] as const,
  reviewRoot: () => [...root, 'review'] as const,
  reviewQueue: (setId?: string) => [...root, 'review', 'queue', { setId: setId ?? null }] as const,
  reviewSummary: () => [...root, 'review', 'summary'] as const,
  mistakesRoot: () => [...root, 'exam-mistakes'] as const,
  mistakes: (limit = 20) => [...root, 'exam-mistakes', { limit }] as const,
};
