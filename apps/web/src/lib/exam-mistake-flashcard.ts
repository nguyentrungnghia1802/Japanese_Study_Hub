import type { FrequentMistakeDto, RetainedMistakeItemDto } from '@japanese-learning/contracts';
import type { FlashcardTextDraft } from '@/components/lookup/lookup-flashcard-dialog';

export function createMistakeFlashcardDraft(item: RetainedMistakeItemDto): FlashcardTextDraft {
  const correct = item.options.find((option) => option.id === item.correctOptionId);
  const selected = item.options.find((option) => option.id === item.selectedOptionId);
  const back = [
    `Đáp án đúng: ${correct?.content ?? 'Chưa có đáp án trong snapshot'}`,
    selected && selected.id !== correct?.id ? `Đã chọn: ${selected.content}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
  return {
    front: item.questionContent.slice(0, 4_000),
    back: back.slice(0, 4_000),
  };
}

export function createFrequentMistakeFlashcardDraft(item: FrequentMistakeDto): FlashcardTextDraft {
  const correct = item.options.find((option) => option.id === item.correctOptionId);
  return {
    front: item.questionContent.slice(0, 4_000),
    back: `Đáp án đúng: ${(correct?.content ?? 'Chưa có đáp án trong snapshot').slice(0, 4_000)}`,
  };
}
