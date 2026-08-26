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
