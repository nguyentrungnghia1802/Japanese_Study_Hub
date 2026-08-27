import type { WrongAnswerReviewItemDto } from '@japanese-learning/contracts';

export interface MistakeGroup {
  examId: string;
  examTitle: string;
  examVersion: number;
  items: WrongAnswerReviewItemDto[];
}

/**
 * Keeps the global queue readable without changing the API's per-Exam retention
 * boundary. Content versions are part of the key so historical versions cannot
 * be presented as one Exam window if stale data reaches the client.
 */
export function groupMistakesByExam(items: readonly WrongAnswerReviewItemDto[]): MistakeGroup[] {
  const groups = new Map<string, MistakeGroup>();

  for (const item of items) {
    const key = `${item.examId}:${item.examVersion}`;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }

    groups.set(key, {
      examId: item.examId,
      examTitle: item.examTitle,
      examVersion: item.examVersion,
      items: [item],
    });
  }

  return [...groups.values()];
}
