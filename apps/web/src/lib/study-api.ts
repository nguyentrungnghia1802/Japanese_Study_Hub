import {
  DashboardSummaryDto,
  ExamDto,
  ExamListItemDto,
  ExamFolderDto,
  ExamAttemptResultDto,
  FlashcardSetDto,
  FlashcardSetListItemDto,
  PaginatedResultDto,
  SearchResultsDto,
  LiveExamAttemptDto,
  RecentLearningResponseDto,
  TagDto,
  FlashcardReviewQueueResponseDto,
  FlashcardReviewResponseDto,
  FlashcardReviewSummaryDto,
  SubmitFlashcardReviewDto,
  StartMistakePracticeDto,
  WrongAnswerReviewQueueDto,
  CreateFlashcardDto,
  FlashcardDto,
  CreateDictionaryFavoriteDto,
  DictionaryFavoriteDto,
  DictionaryFavoriteListResponseDto,
  DictionaryLookupDirection,
  DictionaryLookupHistoryResponseDto,
  DictionaryLookupResponseDto,
  DictionarySuggestionResponseDto,
} from '@japanese-learning/contracts';
import { apiClient } from './api-client';
import { ExamListQuery, FlashcardListQuery } from './query-keys';

function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const encoded = searchParams.toString();
  return encoded ? `?${encoded}` : '';
}

const FORBIDDEN_LIVE_ATTEMPT_KEYS = new Set([
  'isCorrect',
  'correctOptionId',
  'answerKey',
  'correctAnswer',
]);

export function assertLiveAttemptPayload(payload: LiveExamAttemptDto): LiveExamAttemptDto {
  const pending: unknown[] = [payload];

  while (pending.length > 0) {
    const value = pending.pop();
    if (!value || typeof value !== 'object') continue;

    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_LIVE_ATTEMPT_KEYS.has(key)) {
        throw new Error('Live attempt response contains forbidden correctness metadata');
      }
      if (child && typeof child === 'object') pending.push(child);
    }
  }

  return payload;
}

export const studyApi = {
  dashboard: (signal?: AbortSignal) =>
    apiClient<DashboardSummaryDto>('/dashboard/summary', { signal }),

  recentLearning: (limit = 10, signal?: AbortSignal) =>
    apiClient<RecentLearningResponseDto>(`/recent-learning?limit=${limit}`, { signal }),

  flashcardSets: (query: FlashcardListQuery = {}, signal?: AbortSignal) =>
    apiClient<PaginatedResultDto<FlashcardSetListItemDto>>(
      `/flashcard-sets${buildQuery({
        search: query.search,
        page: query.page ?? 1,
        limit: query.pageSize ?? 20,
        sort: query.sort,
        favorite: query.favorite,
        tag: query.tag,
      })}`,
      { signal },
    ),

  flashcardSet: (setId: string, signal?: AbortSignal) =>
    apiClient<FlashcardSetDto>(`/flashcard-sets/${setId}`, { signal }),

  tags: (limit = 100, signal?: AbortSignal) =>
    apiClient<TagDto[]>(`/tags${buildQuery({ limit })}`, { signal }),

  reviewSummary: (signal?: AbortSignal) =>
    apiClient<FlashcardReviewSummaryDto>('/review/summary', { signal }),

  reviewQueue: (limit = 20, signal?: AbortSignal) =>
    apiClient<FlashcardReviewQueueResponseDto>(`/review/queue${buildQuery({ limit })}`, { signal }),

  submitReview: (cardId: string, body: SubmitFlashcardReviewDto, signal?: AbortSignal) =>
    apiClient<FlashcardReviewResponseDto>(`/review/${cardId}`, {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    }),

  mistakes: (limit = 20, examId?: string, signal?: AbortSignal) =>
    apiClient<WrongAnswerReviewQueueDto>(`/exam-review/mistakes${buildQuery({ limit, examId })}`, {
      signal,
    }),

  dismissMistake: (mistakeId: string, signal?: AbortSignal) =>
    apiClient<{ success: boolean }>(`/exam-review/mistakes/${mistakeId}`, {
      method: 'DELETE',
      signal,
    }),

  clearMistakes: (examId?: string, signal?: AbortSignal) =>
    apiClient<{ success: boolean; removedCount: number }>(
      `/exam-review/mistakes${buildQuery({ examId })}`,
      { method: 'DELETE', signal },
    ),

  startMistakePractice: (body: StartMistakePracticeDto, signal?: AbortSignal) =>
    apiClient<LiveExamAttemptDto>('/exam-review/practice', {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    }).then(assertLiveAttemptPayload),

  setFlashcardTags: (setId: string, tags: string[], signal?: AbortSignal) =>
    apiClient<FlashcardSetDto>(`/flashcard-sets/${setId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tags }),
      signal,
    }),

  setFlashcardFavorite: (setId: string, favorite: boolean, signal?: AbortSignal) =>
    apiClient<FlashcardSetDto>(`/flashcard-sets/${setId}/favorite`, {
      method: 'PUT',
      body: JSON.stringify({ favorite }),
      signal,
    }),

  examFolders: (signal?: AbortSignal) => apiClient<ExamFolderDto[]>('/exam-folders', { signal }),

  exams: (query: ExamListQuery = {}, signal?: AbortSignal) =>
    apiClient<PaginatedResultDto<ExamListItemDto>>(
      `/exams${buildQuery({
        folderId: query.folderId,
        search: query.search,
        page: query.page ?? 1,
        limit: query.pageSize ?? 20,
        sort: query.sort,
        favorite: query.favorite,
        tag: query.tag,
      })}`,
      { signal },
    ),

  exam: (examId: string, signal?: AbortSignal) =>
    apiClient<ExamDto>(`/exams/${examId}`, { signal }),

  setExamTags: (examId: string, tags: string[], signal?: AbortSignal) =>
    apiClient<ExamDto>(`/exams/${examId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tags }),
      signal,
    }),

  setExamFavorite: (examId: string, favorite: boolean, signal?: AbortSignal) =>
    apiClient<ExamDto>(`/exams/${examId}/favorite`, {
      method: 'PUT',
      body: JSON.stringify({ favorite }),
      signal,
    }),

  search: (query: string, limit = 30, signal?: AbortSignal) =>
    apiClient<SearchResultsDto>(`/search${buildQuery({ q: query.trim(), limit })}`, { signal }),

  dictionaryLookup: (
    query: string,
    direction: DictionaryLookupDirection = DictionaryLookupDirection.AUTO,
    limit = 20,
    includeExamples = false,
    signal?: AbortSignal,
  ) =>
    apiClient<DictionaryLookupResponseDto>(
      `/lookup${buildQuery({ q: query.trim(), direction, limit, includeExamples })}`,
      { signal },
    ),

  dictionarySuggestions: (
    query: string,
    direction: DictionaryLookupDirection = DictionaryLookupDirection.AUTO,
    limit = 10,
    signal?: AbortSignal,
  ) =>
    apiClient<DictionarySuggestionResponseDto>(
      `/lookup/suggest${buildQuery({ q: query.trim(), direction, limit })}`,
      { signal },
    ),

  dictionaryHistory: (limit = 10, signal?: AbortSignal) =>
    apiClient<DictionaryLookupHistoryResponseDto>(`/lookup/history${buildQuery({ limit })}`, {
      signal,
    }),

  clearDictionaryHistory: (signal?: AbortSignal) =>
    apiClient<{ deleted: number }>('/lookup/history', { method: 'DELETE', signal }),

  dictionaryFavorites: (limit = 20, offset = 0, signal?: AbortSignal) =>
    apiClient<DictionaryFavoriteListResponseDto>(
      `/lookup/favorites${buildQuery({ limit, offset })}`,
      { signal },
    ),

  saveDictionaryFavorite: (body: CreateDictionaryFavoriteDto, signal?: AbortSignal) =>
    apiClient<DictionaryFavoriteDto>('/lookup/favorites', {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    }),

  removeDictionaryFavorite: (favoriteId: string, signal?: AbortSignal) =>
    apiClient<{ success: true; id: string }>(`/lookup/favorites/${favoriteId}`, {
      method: 'DELETE',
      signal,
    }),

  createFlashcard: (setId: string, body: CreateFlashcardDto, signal?: AbortSignal) =>
    apiClient<FlashcardDto>(`/flashcard-sets/${setId}/cards`, {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    }),

  liveAttempt: (attemptId: string, signal?: AbortSignal) =>
    apiClient<LiveExamAttemptDto>(`/attempts/${attemptId}`, { signal }).then(
      assertLiveAttemptPayload,
    ),

  startAttempt: (examId: string, signal?: AbortSignal) =>
    apiClient<LiveExamAttemptDto>(`/exams/${examId}/attempts`, {
      method: 'POST',
      signal,
    }).then(assertLiveAttemptPayload),

  submitAttempt: (attemptId: string, body: unknown, signal?: AbortSignal) =>
    apiClient<ExamAttemptResultDto>(`/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    }),
};
