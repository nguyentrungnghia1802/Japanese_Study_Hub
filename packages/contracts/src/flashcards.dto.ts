import { TagDto } from './tags.dto.js';

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
  isFavorite: boolean;
  tags: TagDto[];
  cardCount: number;
  createdAt: string;
  updatedAt: string;
  cards?: FlashcardDto[];
}

/** Purpose-specific bounded item used by collection endpoints; cards stay on the detail route. */
export type FlashcardSetListItemDto = Omit<FlashcardSetDto, 'cards'>;

export type FlashcardSetResponseDto = FlashcardSetDto;

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
