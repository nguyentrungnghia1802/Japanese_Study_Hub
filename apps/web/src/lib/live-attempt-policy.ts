const ACTIVE_ATTEMPT_PREFIX = 'jsh_active_attempt_v1:';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  } catch {
    // Session storage is an optimization; the server remains authoritative.
  }
}

export function clearActiveAttemptId(examId: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(getActiveAttemptStorageKey(examId));
  } catch {
    // Session storage can be unavailable in privacy-restricted contexts.
  }
}

export function getServerRemainingSeconds(
  expiresAt: string | null,
  now = Date.now(),
): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000));
}
