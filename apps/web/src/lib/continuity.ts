import { normalizeLookupReturnPath } from './lookup-helpers';

const FLASHCARD_CONTINUITY_PREFIX = 'jsh_flashcard_study_v1:';
const EXAM_REVIEW_CONTINUITY_PREFIX = 'jsh_exam_review_v1:';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTINUITY_KEY_PREFIXES = [
  FLASHCARD_CONTINUITY_PREFIX,
  EXAM_REVIEW_CONTINUITY_PREFIX,
] as const;

export const CONTINUITY_TTL_MS = 30 * 60 * 1000;
export const MAX_CONTINUITY_CARD_IDS = 500;
export const MAX_CONTINUITY_BYTES = 32 * 1024;
export const MAX_CONTINUITY_ENTRIES = 8;

export type ExamReviewFilter = 'ALL' | 'WRONG' | 'UNANSWERED';

export interface FlashcardStudyContinuity {
  kind: 'flashcard-study';
  setId: string;
  sessionId: string;
  cardIds: string[];
  currentCardId: string | null;
  currentIndex: number;
  isFlipped: boolean;
  isShuffled: boolean;
  isCompleted: boolean;
  progress: number;
  returnTo: string;
  updatedAt: number;
  expiresAt: number;
}

export interface ExamReviewContinuity {
  kind: 'exam-review';
  attemptId: string;
  examId: string;
  examVersion: number;
  currentQuestionId: string | null;
  filter: ExamReviewFilter;
  scrollTop: number;
  returnTo: string;
  updatedAt: number;
  expiresAt: number;
}

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isFiniteInteger(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum
  );
}

function byteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).length;
  return value.length * 2;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isContinuityKey(key: string): boolean {
  return CONTINUITY_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function pruneContinuityStorage(storage: Storage, keepKey?: string, now = Date.now()): void {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (key): key is string => key !== null && isContinuityKey(key),
  );
  const candidates: Array<{ key: string; updatedAt: number }> = [];

  for (const key of keys) {
    const raw = storage.getItem(key);
    if (!raw || byteLength(raw) > MAX_CONTINUITY_BYTES) {
      storage.removeItem(key);
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as { expiresAt?: unknown; updatedAt?: unknown };
      if (
        typeof parsed.expiresAt !== 'number' ||
        !Number.isFinite(parsed.expiresAt) ||
        parsed.expiresAt <= now
      ) {
        storage.removeItem(key);
        continue;
      }
      candidates.push({
        key,
        updatedAt:
          typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
            ? parsed.updatedAt
            : 0,
      });
    } catch {
      storage.removeItem(key);
    }
  }

  candidates.sort(
    (left, right) => right.updatedAt - left.updatedAt || left.key.localeCompare(right.key),
  );
  const retained = new Set(candidates.slice(0, MAX_CONTINUITY_ENTRIES).map(({ key }) => key));
  if (keepKey && !retained.has(keepKey)) {
    const evicted = candidates.find(({ key }) => key !== keepKey);
    if (evicted) {
      storage.removeItem(evicted.key);
      retained.delete(evicted.key);
    }
    retained.add(keepKey);
  }
  for (const { key } of candidates) {
    if (!retained.has(key)) storage.removeItem(key);
  }
}

function readJson<T>(key: string, now = Date.now()): T | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    pruneContinuityStorage(storage, undefined, now);
    const raw = storage.getItem(key);
    if (!raw || byteLength(raw) > MAX_CONTINUITY_BYTES) {
      if (raw) storage.removeItem(key);
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Storage is an optional optimization.
    }
    return null;
  }
}

function writeJson(key: string, value: unknown, now = Date.now()): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const serialized = JSON.stringify(value);
    if (byteLength(serialized) > MAX_CONTINUITY_BYTES) return false;
    storage.setItem(key, serialized);
    pruneContinuityStorage(storage, key, now);
    return true;
  } catch {
    return false;
  }
}

function remove(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Storage is an optional optimization.
  }
}

function normalizeReturnTo(returnTo: unknown, fallback: string): string {
  return normalizeLookupReturnPath(typeof returnTo === 'string' ? returnTo : fallback) ?? fallback;
}

function isFresh(updatedAt: unknown, expiresAt: unknown, now: number): boolean {
  return (
    typeof updatedAt === 'number' &&
    Number.isFinite(updatedAt) &&
    typeof expiresAt === 'number' &&
    Number.isFinite(expiresAt) &&
    expiresAt >= now &&
    updatedAt <= now + 5_000
  );
}

function isUniqueIdList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_CONTINUITY_CARD_IDS &&
    value.every(isSafeId) &&
    new Set(value).size === value.length
  );
}

function validateFlashcardState(
  value: unknown,
  setId: string,
  now: number,
): FlashcardStudyContinuity | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<FlashcardStudyContinuity>;
  if (
    candidate.kind !== 'flashcard-study' ||
    candidate.setId !== setId ||
    !isSafeId(candidate.setId) ||
    typeof candidate.sessionId !== 'string' ||
    candidate.sessionId.length < 1 ||
    candidate.sessionId.length > 80 ||
    !isUniqueIdList(candidate.cardIds) ||
    (candidate.currentCardId !== null && !isSafeId(candidate.currentCardId)) ||
    !isFiniteInteger(candidate.currentIndex, 0, MAX_CONTINUITY_CARD_IDS - 1) ||
    typeof candidate.isFlipped !== 'boolean' ||
    typeof candidate.isShuffled !== 'boolean' ||
    typeof candidate.isCompleted !== 'boolean' ||
    !isFiniteInteger(candidate.progress, 0, 100) ||
    !isFresh(candidate.updatedAt, candidate.expiresAt, now)
  ) {
    return null;
  }
  if (candidate.currentIndex >= candidate.cardIds.length) return null;
  if (candidate.currentCardId && !candidate.cardIds.includes(candidate.currentCardId)) return null;
  return {
    kind: 'flashcard-study',
    setId,
    sessionId: candidate.sessionId,
    cardIds: candidate.cardIds,
    currentCardId: candidate.currentCardId ?? null,
    currentIndex: candidate.currentIndex,
    isFlipped: candidate.isFlipped,
    isShuffled: candidate.isShuffled,
    isCompleted: candidate.isCompleted,
    progress: candidate.progress,
    returnTo: normalizeReturnTo(candidate.returnTo, `/flashcards/${setId}/study`),
    updatedAt: candidate.updatedAt as number,
    expiresAt: candidate.expiresAt as number,
  };
}

function validateExamReviewState(
  value: unknown,
  attemptId: string,
  now: number,
): ExamReviewContinuity | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ExamReviewContinuity>;
  if (
    candidate.kind !== 'exam-review' ||
    candidate.attemptId !== attemptId ||
    !isSafeId(candidate.attemptId) ||
    !isSafeId(candidate.examId) ||
    !isFiniteInteger(candidate.examVersion, 1, 1_000_000) ||
    (candidate.currentQuestionId !== null && !isSafeId(candidate.currentQuestionId)) ||
    !['ALL', 'WRONG', 'UNANSWERED'].includes(candidate.filter ?? '') ||
    !isFiniteInteger(candidate.scrollTop, 0, 2_000_000) ||
    !isFresh(candidate.updatedAt, candidate.expiresAt, now)
  ) {
    return null;
  }
  return {
    kind: 'exam-review',
    attemptId,
    examId: candidate.examId,
    examVersion: candidate.examVersion,
    currentQuestionId: candidate.currentQuestionId ?? null,
    filter: candidate.filter as ExamReviewFilter,
    scrollTop: candidate.scrollTop,
    returnTo: normalizeReturnTo(
      candidate.returnTo,
      `/exams/${candidate.examId}/review/${attemptId}`,
    ),
    updatedAt: candidate.updatedAt as number,
    expiresAt: candidate.expiresAt as number,
  };
}

export function getFlashcardContinuityKey(setId: string): string {
  return `${FLASHCARD_CONTINUITY_PREFIX}${setId}`;
}

export function getExamReviewContinuityKey(attemptId: string): string {
  return `${EXAM_REVIEW_CONTINUITY_PREFIX}${attemptId}`;
}

export function readFlashcardStudyContinuity(
  setId: string,
  now = Date.now(),
): FlashcardStudyContinuity | null {
  if (!isSafeId(setId)) return null;
  const key = getFlashcardContinuityKey(setId);
  const parsed = readJson<unknown>(key, now);
  const validated = validateFlashcardState(parsed, setId, now);
  if (!validated) remove(key);
  return validated;
}

export function writeFlashcardStudyContinuity(
  state: Omit<FlashcardStudyContinuity, 'updatedAt' | 'expiresAt' | 'kind'> &
    Partial<Pick<FlashcardStudyContinuity, 'updatedAt' | 'expiresAt'>>,
  now = Date.now(),
): boolean {
  if (!isSafeId(state.setId) || !isUniqueIdList(state.cardIds)) return false;
  const currentIndex = Math.min(
    Math.max(Math.floor(state.currentIndex), 0),
    state.cardIds.length - 1,
  );
  const normalized: FlashcardStudyContinuity = {
    kind: 'flashcard-study',
    setId: state.setId,
    sessionId: state.sessionId.slice(0, 80),
    cardIds: state.cardIds.slice(0, MAX_CONTINUITY_CARD_IDS),
    currentCardId:
      state.currentCardId && isSafeId(state.currentCardId) ? state.currentCardId : null,
    currentIndex,
    isFlipped: Boolean(state.isFlipped),
    isShuffled: Boolean(state.isShuffled),
    isCompleted: Boolean(state.isCompleted),
    progress: Math.min(100, Math.max(0, Math.floor(state.progress))),
    returnTo: normalizeReturnTo(state.returnTo, `/flashcards/${state.setId}/study`),
    updatedAt: state.updatedAt ?? now,
    expiresAt: state.expiresAt ?? now + CONTINUITY_TTL_MS,
  };
  return writeJson(getFlashcardContinuityKey(state.setId), normalized, now);
}

export function clearFlashcardStudyContinuity(setId: string): void {
  if (isSafeId(setId)) remove(getFlashcardContinuityKey(setId));
}

export function resolveFlashcardStudyOrder(
  saved: FlashcardStudyContinuity | null,
  availableCardIds: string[],
): string[] | null {
  if (
    !saved ||
    !isUniqueIdList(availableCardIds) ||
    saved.cardIds.length !== availableCardIds.length
  ) {
    return null;
  }
  const available = new Set(availableCardIds);
  return saved.cardIds.every((cardId) => available.has(cardId)) &&
    new Set(saved.cardIds).size === available.size
    ? [...saved.cardIds]
    : null;
}

export function readExamReviewContinuity(
  attemptId: string,
  now = Date.now(),
): ExamReviewContinuity | null {
  if (!isSafeId(attemptId)) return null;
  const key = getExamReviewContinuityKey(attemptId);
  const parsed = readJson<unknown>(key, now);
  const validated = validateExamReviewState(parsed, attemptId, now);
  if (!validated) remove(key);
  return validated;
}

export function writeExamReviewContinuity(
  state: Omit<ExamReviewContinuity, 'updatedAt' | 'expiresAt' | 'kind'> &
    Partial<Pick<ExamReviewContinuity, 'updatedAt' | 'expiresAt'>>,
  now = Date.now(),
): boolean {
  if (!isSafeId(state.attemptId) || !isSafeId(state.examId)) return false;
  const normalized: ExamReviewContinuity = {
    kind: 'exam-review',
    attemptId: state.attemptId,
    examId: state.examId,
    examVersion: Math.floor(state.examVersion),
    currentQuestionId:
      state.currentQuestionId && isSafeId(state.currentQuestionId) ? state.currentQuestionId : null,
    filter: ['ALL', 'WRONG', 'UNANSWERED'].includes(state.filter) ? state.filter : 'ALL',
    scrollTop: Math.min(2_000_000, Math.max(0, Math.floor(state.scrollTop))),
    returnTo: normalizeReturnTo(state.returnTo, `/exams/${state.examId}/review/${state.attemptId}`),
    updatedAt: state.updatedAt ?? now,
    expiresAt: state.expiresAt ?? now + CONTINUITY_TTL_MS,
  };
  return writeJson(getExamReviewContinuityKey(state.attemptId), normalized, now);
}

export function clearExamReviewContinuity(attemptId: string): void {
  if (isSafeId(attemptId)) remove(getExamReviewContinuityKey(attemptId));
}
