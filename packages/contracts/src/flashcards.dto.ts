export interface FlashcardDto {
  id: string;
  setId: string;
  front: string;
  back: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardSetDto {
  id: string;
  title: string;
  description: string | null;
  coverRef: string | null;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
  cards?: FlashcardDto[];
}

export interface CreateFlashcardSetDto {
  title: string;
  description?: string | null;
  coverRef?: string | null;
}

export interface UpdateFlashcardSetDto {
  title?: string;
  description?: string | null;
  coverRef?: string | null;
}

export interface CreateFlashcardDto {
  front: string;
  back: string;
  position?: number;
}

export interface UpdateFlashcardDto {
  front?: string;
  back?: string;
  position?: number;
}

export interface ReorderFlashcardsDto {
  cardIds: string[];
}
