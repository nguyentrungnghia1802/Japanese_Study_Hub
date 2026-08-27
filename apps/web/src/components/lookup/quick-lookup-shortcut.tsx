'use client';

import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { normalizeLookupReturnPath } from '@/lib/lookup-helpers';
import { ACTIVE_ATTEMPT_STATE_EVENT, hasAnyActiveExamAttempt } from '@/lib/live-attempt-policy';

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

export function createLookupReturnPath(pathname: string, search: string): string {
  const value = `${pathname}${search}`;
  return normalizeLookupReturnPath(value) ?? '/';
}

export default function QuickLookupShortcut() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [lookupBlocked, setLookupBlocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blockedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBlockedMessage = useCallback(() => {
    setOpen(false);
    setLookupBlocked(true);
    if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
    blockedTimerRef.current = setTimeout(() => setLookupBlocked(false), 4000);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const syncAttemptState = () => {
      const blocked = hasAnyActiveExamAttempt();
      setLookupBlocked(blocked);
      if (blocked) setOpen(false);
    };
    syncAttemptState();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (isEditableShortcutTarget(event.target)) return;
      const isQuickKey =
        (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) ||
        (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey);
      if (!isQuickKey) return;

      event.preventDefault();
      if (hasAnyActiveExamAttempt()) {
        showBlockedMessage();
        return;
      }
      if (pathname === '/lookup') {
        window.dispatchEvent(new CustomEvent('lookup:focus'));
      } else {
        setOpen(true);
        setQuery('');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(ACTIVE_ATTEMPT_STATE_EVENT, syncAttemptState);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(ACTIVE_ATTEMPT_STATE_EVENT, syncAttemptState);
    };
  }, [isAuthenticated, open, pathname, showBlockedMessage]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(
    () => () => {
      if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
    },
    [],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (hasAnyActiveExamAttempt()) {
      showBlockedMessage();
      return;
    }
    const returnTo = createLookupReturnPath(
      pathname,
      typeof window !== 'undefined' ? window.location.search : '',
    );
    const params = new URLSearchParams({ q: trimmed, returnTo });
    router.push(`/lookup?${params.toString()}`);
    setOpen(false);
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {lookupBlocked && (
        <div
          role="status"
          style={{
            position: 'fixed',
            right: '1rem',
            bottom: '1rem',
            zIndex: 95,
            maxWidth: 'min(90vw, 420px)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(251, 191, 36, 0.45)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          Lookup is unavailable while an exam attempt is in progress. Submit the exam before using
          dictionary lookup.
        </div>
      )}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick Lookup"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            display: 'grid',
            placeItems: 'start center',
            padding: '13vh 1rem 1rem',
            background: 'rgba(2, 6, 23, 0.68)',
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <form
            onSubmit={submit}
            style={{
              width: 'min(100%, 520px)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              padding: '0.65rem 0.75rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <Search size={19} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tra cứu Nhật–Việt…"
              aria-label="Quick Lookup query"
              autoComplete="off"
              style={{
                flex: 1,
                minWidth: 0,
                padding: '0.55rem 0.2rem',
                border: 0,
                outline: 0,
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Hủy Quick Lookup"
              style={{ color: 'var(--text-muted)', padding: '0.3rem' }}
            >
              <X size={17} />
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
              Esc
            </span>
          </form>
        </div>
      )}
    </>
  );
}
