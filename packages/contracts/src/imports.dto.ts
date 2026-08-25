import { DuplicatePolicy, ImportType } from './enums.js';
import { CreateExamQuestionDto } from './exams.dto.js';

export interface ImportErrorDetailDto {
  code: string;
  message: string;
  line?: number;
  question?: number;
  card?: number;
  severity: 'ERROR' | 'WARNING';
}

export interface FlashcardParsedCardDto {
  number: number;
  front: string;
  back: string;
}

export interface FlashcardPreviewDto {
  title: string;
  description: string | null;
  cardCount: number;
  cards: FlashcardParsedCardDto[];
  warnings: ImportErrorDetailDto[];
  errors: ImportErrorDetailDto[];
}

export interface FlashcardImportPreviewResponseDto {
  importToken: string;
  expiresAt: string;
  preview: FlashcardPreviewDto;
}

export interface FlashcardImportConfirmRequestDto {
  importToken: string;
  duplicatePolicy?: DuplicatePolicy;
}

export interface ExamParsedMetadataDto {
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questionCount: number;
  optionCount: number;
}

export interface ExamPreviewDto {
  metadata: ExamParsedMetadataDto;
  questions: CreateExamQuestionDto[];
  warnings: ImportErrorDetailDto[];
  errors: ImportErrorDetailDto[];
}

export interface ExamImportPreviewResponseDto {
  importToken: string;
  expiresAt: string;
  preview: ExamPreviewDto;
}

export interface ExamImportConfirmRequestDto {
  importToken: string;
  folderId?: string | null;
  duplicatePolicy?: DuplicatePolicy;
}

export interface ImportSessionPayloadDto {
  type: ImportType;
  flashcardData?: {
    title: string;
    description: string | null;
    cards: { front: string; back: string; position: number }[];
  };
  examData?: {
    title: string;
    description: string | null;
    timeLimitSeconds: number | null;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    questions: CreateExamQuestionDto[];
  };
}
