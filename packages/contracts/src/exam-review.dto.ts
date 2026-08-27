import { QuestionType } from './enums.js';
import { LiveExamOptionDto } from './exams.dto.js';

export interface WrongAnswerReviewItemDto {
  id: string;
  examId: string;
  examTitle: string;
  examVersion: number;
  questionId: string;
  questionType: QuestionType;
  questionContent: string;
  options: LiveExamOptionDto[];
  selectedOptionId: string | null;
  sourceAttemptId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WrongAnswerReviewQueueDto {
  items: WrongAnswerReviewItemDto[];
  total: number;
}

export interface StartMistakePracticeDto {
  examId: string;
  mistakeIds: string[];
}

export interface RetainedMistakeOptionDto {
  id: string;
  content: string;
  position: number;
  isCorrect: boolean;
}

export interface RetainedMistakeItemDto {
  id: string;
  examId: string;
  examTitle: string;
  examVersion: number;
  questionId: string;
  questionType: QuestionType;
  questionContent: string;
  questionPosition: number;
  options: RetainedMistakeOptionDto[];
  selectedOptionId: string | null;
  correctOptionId: string | null;
  isCorrect: boolean;
  isUnanswered: boolean;
  sourceAttemptId: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MistakeAttemptSummaryDto {
  attemptId: string;
  examId: string;
  examTitle: string;
  examVersion: number;
  submittedAt: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number | null;
  mistakeCount: number;
}

export interface MistakeAttemptListDto {
  attempts: MistakeAttemptSummaryDto[];
}

export interface MistakeAttemptDetailDto {
  attempt: MistakeAttemptSummaryDto;
  items: RetainedMistakeItemDto[];
}

export interface FrequentMistakeDto {
  examId: string;
  examVersion: number;
  questionId: string;
  questionType: QuestionType;
  questionContent: string;
  questionPosition: number;
  options: RetainedMistakeOptionDto[];
  correctOptionId: string | null;
  occurrenceCount: number;
  retainedAttemptCount: number;
  sourceAttemptId: string;
}

export interface FrequentMistakeSummaryDto {
  examId: string;
  examVersion: number;
  retainedAttemptCount: number;
  items: FrequentMistakeDto[];
}
