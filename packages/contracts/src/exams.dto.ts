import { QuestionType, AttemptStatus } from './enums.js';
import { TagDto } from './tags.dto.js';

export interface ExamFolderDto {
  id: string;
  parentId: string | null;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  children?: ExamFolderDto[];
  examCount?: number;
}

export interface CreateExamFolderDto {
  name: string;
  parentId?: string | null;
  position?: number;
}

export interface UpdateExamFolderDto {
  name?: string;
  parentId?: string | null;
  position?: number;
}

export interface ExamOptionDto {
  id: string;
  content: string;
  position: number;
  isCorrect?: boolean; // ONLY present in admin/editing context or after graded submission
}

export interface ExamQuestionDto {
  id: string;
  examId: string;
  type: QuestionType;
  content: string;
  position: number;
  options: ExamOptionDto[];
  contextId?: string | null;
}

export interface ExamDto {
  id: string;
  folderId: string | null;
  title: string;
  description: string | null;
  coverRef: string | null;
  isFavorite: boolean;
  tags: TagDto[];
  timeLimitSeconds: number | null;
  contentVersion: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questionCount: number;
  bestScore?: number | null;
  bestResult?: ExamBestResultDto | null;
  createdAt: string;
  updatedAt: string;
  questions?: ExamQuestionDto[];
}

/** Purpose-specific collection item; question and option trees stay on detail/attempt routes. */
export type ExamListItemDto = Omit<ExamDto, 'questions' | 'shuffleQuestions' | 'shuffleOptions'>;

export interface CreateExamDto {
  folderId?: string | null;
  title: string;
  description?: string | null;
  coverRef?: string | null;
  timeLimitSeconds?: number | null;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  questions?: CreateExamQuestionDto[];
}

export interface UpdateExamMetadataDto {
  folderId?: string | null;
  title?: string;
  description?: string | null;
  coverRef?: string | null;
  timeLimitSeconds?: number | null;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}

export interface CreateExamOptionDto {
  content: string;
  isCorrect: boolean;
  position: number;
}

export interface CreateExamQuestionDto {
  type: QuestionType;
  content: string;
  position: number;
  options: CreateExamOptionDto[];
}

export interface UpdateExamContentDto {
  questions: CreateExamQuestionDto[];
}

// Live attempt DTOs (MUST NEVER leak isCorrect or answer keys)
export interface LiveExamOptionDto {
  id: string;
  content: string;
  position: number;
}

export interface LiveExamQuestionDto {
  id: string;
  type: QuestionType;
  content: string;
  position: number;
  options: LiveExamOptionDto[];
}

export interface LiveExamAttemptDto {
  attemptId: string;
  examId: string;
  examTitle: string;
  examVersion: number;
  timeLimitSeconds: number | null;
  startedAt: string;
  expiresAt: string | null;
  status: AttemptStatus;
  totalQuestions: number;
  questions: LiveExamQuestionDto[];
  savedAnswers?: Record<string, string | null>; // questionId -> selectedOptionId
  isPractice?: boolean;
}

export interface SaveAnswersDto {
  answers: {
    questionId: string;
    selectedOptionId: string | null;
  }[];
}

export interface SubmitAttemptDto {
  answers?: {
    questionId: string;
    selectedOptionId: string | null;
  }[];
}

export interface QuestionGradedResultDto {
  questionId: string;
  type: QuestionType;
  content: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  options: {
    id: string;
    content: string;
    position: number;
    isCorrect: boolean;
  }[];
}

export interface ExamAttemptResultDto {
  attemptId: string;
  examId: string;
  examTitle: string;
  examVersion: number;
  status: AttemptStatus;
  score: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number | null;
  startedAt: string;
  submittedAt: string;
  questions: QuestionGradedResultDto[];
  isNewBest: boolean;
  bestScore: number;
  isPractice?: boolean;
}

export interface ExamBestResultDto {
  id: string;
  examId: string;
  examVersion: number;
  bestScore: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number | null;
  attemptCount: number;
  achievedAt: string;
  lastAttemptAt: string;
}
