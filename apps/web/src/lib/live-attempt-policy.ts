const ACTIVE_ATTEMPT_PREFIX = 'jsh_active_attempt_v1:';
const ACTIVE_ATTEMPT_INDEX_KEY = 'jsh_active_attempt_index_v1';
const PENDING_ATTEMPT_INDEX_KEY = 'jsh_pending_attempt_index_v1';
const ACTIVE_ATTEMPT_STATE_EVENT = 'jsh:active-attempt-state-changed';
const MAX_ACTIVE_ATTEMPT_INDEX = 8;
const PENDING_ATTEMPT_TTL_MS = 2 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export { ACTIVE_ATTEMPT_STATE_EVENT };

export function getActiveAttemptStorageKey(examId: string): string {
  return `${ACTIVE_ATTEMPT_PREFIX}${examId}`;
}

export function readActiveAttemptId(examId: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const value = window.sessionStorage.getItem(getActiveAttemptStorageKey(examId));
    if (!value || !UUID_PATTERN.test(value)) {
      if (value) window.sessionStorage.removeItem(getActiveAttemptStorageKey(examId));
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function writeActiveAttemptId(examId: string, attemptId: string): void {
  if (typeof window === 'undefined' || !UUID_PATTERN.test(attemptId)) return;

  try {
    window.sessionStorage.setItem(getActiveAttemptStorageKey(examId), attemptId);
    removePendingAttemptId(examId);
    updateActiveAttemptIndex(examId, true);
    notifyAttemptStateChanged();
  } catch {
    // Session storage is an optimization; the server remains authoritative.
  }
}

export function clearActiveAttemptId(examId: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(getActiveAttemptStorageKey(examId));
    removePendingAttemptId(examId);
    updateActiveAttemptIndex(examId, false);
    notifyAttemptStateChanged();
  } catch {
    // Session storage can be unavailable in privacy-restricted contexts.
  }
}

interface PendingAttemptMarker {
  examId: string;
  expiresAt: number;
}

function readActiveAttemptIndex(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_ATTEMPT_INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((value): value is string => typeof value === 'string' && value.length <= 100)
          .slice(0, MAX_ACTIVE_ATTEMPT_INDEX)
      : [];
  } catch {
    return [];
  }
}

function updateActiveAttemptIndex(examId: string, active: boolean): void {
  if (typeof window === 'undefined' || !examId || examId.length > 100) return;
  try {
    const current = readActiveAttemptIndex().filter((value) => value !== examId);
    const next = active ? [examId, ...current].slice(0, MAX_ACTIVE_ATTEMPT_INDEX) : current;
    if (next.length > 0) window.sessionStorage.setItem(ACTIVE_ATTEMPT_INDEX_KEY, JSON.stringify(next));
    else window.sessionStorage.removeItem(ACTIVE_ATTEMPT_INDEX_KEY);
  } catch {
    // Session storage is an optimization; the server remains authoritative.
  }
}

function readPendingAttemptIndex(now = Date.now()): PendingAttemptMarker[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(PENDING_ATTEMPT_INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const valid = Array.isArray(parsed)
      ? parsed.filter(
          (value): value is PendingAttemptMarker =>
            Boolean(value) &&
            typeof value === 'object' &&
            typeof (value as PendingAttemptMarker).examId === 'string' &&
            (value as PendingAttemptMarker).examId.length <= 100 &&
            typeof (value as PendingAttemptMarker).expiresAt === 'number' &&
            (value as PendingAttemptMarker).expiresAt >= now,
        )
      : [];
    if (valid.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
      writePendingAttemptIndex(valid);
    }
    return valid.slice(0, MAX_ACTIVE_ATTEMPT_INDEX);
  } catch {
    return [];
  }
}

function writePendingAttemptIndex(markers: PendingAttemptMarker[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (markers.length > 0) {
      window.sessionStorage.setItem(
        PENDING_ATTEMPT_INDEX_KEY,
        JSON.stringify(markers.slice(0, MAX_ACTIVE_ATTEMPT_INDEX)),
      );
    } else {
      window.sessionStorage.removeItem(PENDING_ATTEMPT_INDEX_KEY);
    }
  } catch {
    // Session storage is an optimization; the server remains authoritative.
  }
}

function removePendingAttemptId(examId: string): void {
  const remaining = readPendingAttemptIndex().filter((marker) => marker.examId !== examId);
  writePendingAttemptIndex(remaining);
}

export function markExamAttemptPending(examId: string): void {
  if (typeof window === 'undefined' || !examId || examId.length > 100) return;
  const remaining = readPendingAttemptIndex().filter((marker) => marker.examId !== examId);
  writePendingAttemptIndex([{ examId, expiresAt: Date.now() + PENDING_ATTEMPT_TTL_MS }, ...remaining]);
  notifyAttemptStateChanged();
}

export function clearExamAttemptPending(examId: string): void {
  if (typeof window === 'undefined') return;
  removePendingAttemptId(examId);
  notifyAttemptStateChanged();
}

export function hasAnyActiveExamAttempt(): boolean {
  if (typeof window === 'undefined') return false;
  const activeExamIds = readActiveAttemptIndex();
  const validExamIds = activeExamIds.filter((examId) => Boolean(readActiveAttemptId(examId)));
  if (validExamIds.length !== activeExamIds.length) {
    try {
      if (validExamIds.length > 0) {
        window.sessionStorage.setItem(ACTIVE_ATTEMPT_INDEX_KEY, JSON.stringify(validExamIds));
      } else {
        window.sessionStorage.removeItem(ACTIVE_ATTEMPT_INDEX_KEY);
      }
    } catch {
      // Ignore unavailable storage.
    }
  }
  return validExamIds.length > 0 || readPendingAttemptIndex().length > 0;
}

export function notifyAttemptStateChanged(): void {
  if (
    typeof window === 'undefined' ||
    typeof window.dispatchEvent !== 'function' ||
    typeof CustomEvent === 'undefined'
  ) {
    return;
  }
  window.dispatchEvent(new CustomEvent(ACTIVE_ATTEMPT_STATE_EVENT));
}

export function getServerRemainingSeconds(
  expiresAt: string | null,
  now = Date.now(),
): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000));
}
