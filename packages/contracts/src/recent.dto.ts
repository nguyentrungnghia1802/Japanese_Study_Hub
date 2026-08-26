export type RecentLearningKind = 'FLASHCARD_SET' | 'EXAM';

export interface RecentLearningItemDto {
  kind: RecentLearningKind;
  entityId: string;
  title: string;
  subtitle: string | null;
  cardCount?: number;
  questionCount?: number;
  lastAccessedAt: string;
  href: string;
}

export interface RecentLearningResponseDto {
  items: RecentLearningItemDto[];
}
