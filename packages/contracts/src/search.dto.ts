import { FlashcardSetDto, FlashcardDto } from './flashcards.dto.js';
import { ExamDto, ExamFolderDto } from './exams.dto.js';
import { RecentLearningItemDto } from './recent.dto.js';

export interface PaginatedResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SearchResultsDto {
  flashcardSets: FlashcardSetDto[];
  flashcards: (FlashcardDto & { setName: string })[];
  exams: ExamDto[];
  folders: ExamFolderDto[];
  total: number;
}

export interface DashboardSummaryDto {
  recentFlashcardSets: FlashcardSetDto[];
  recentExams: ExamDto[];
  totalFlashcardSets: number;
  totalCards: number;
  totalExams: number;
  recentBestScores: {
    examId: string;
    examTitle: string;
    bestScore: number;
    achievedAt: string;
  }[];
  recentLearning: RecentLearningItemDto[];
}

export interface ApiErrorResponseDto {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
    requestId?: string;
  };
}
