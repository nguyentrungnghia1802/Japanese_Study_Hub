'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Languages, RotateCw, Search, Sparkles } from 'lucide-react';
import {
  DictionaryFavoriteListResponseDto,
  DictionaryLookupDirection,
  DictionaryLookupHistoryResponseDto,
  DictionaryLookupResponseDto,
} from '@japanese-learning/contracts';
import { getApiErrorMessage, ApiError } from '@/lib/api-client';
import { CACHE_POLICY } from '@/lib/cache-policy';
import { queryKeys } from '@/lib/query-keys';
import { studyApi } from '@/lib/study-api';
import {
  hasDictionaryResult,
  normalizeLookupReturnPath,
  parseLookupDirection,
} from '@/lib/lookup-helpers';
import { ACTIVE_ATTEMPT_STATE_EVENT, hasAnyActiveExamAttempt } from '@/lib/live-attempt-policy';
import LookupFlashcardDialog from '@/components/lookup/lookup-flashcard-dialog';
import { getLookupPrimaryCard } from '@/components/lookup/lookup-results';
import LookupResults from '@/components/lookup/lookup-results';
import LookupSavedItems from '@/components/lookup/lookup-saved-items';

const LOOKUP_LIMIT = 20;
const SUGGESTION_LIMIT = 10;

const DIRECTION_OPTIONS: Array<{
  value: DictionaryLookupDirection;
  label: string;
  hint: string;
}> = [
  { value: DictionaryLookupDirection.AUTO, label: 'Tự động', hint: 'Auto' },
  { value: DictionaryLookupDirection.JA_TO_VI, label: 'Nhật → Việt', hint: 'JA → VI' },
  { value: DictionaryLookupDirection.VI_TO_JA, label: 'Việt → Nhật', hint: 'VI → JA' },
];

function updateLookupUrl(
  router: ReturnType<typeof useRouter>,
  query: string,
  direction: DictionaryLookupDirection,
  returnTo?: string | null,
): void {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (direction !== DictionaryLookupDirection.AUTO) params.set('direction', direction);
  if (returnTo) params.set('returnTo', returnTo);
  const encoded = params.toString();
  router.replace(`/lookup${encoded ? `?${encoded}` : ''}`, { scroll: false });
}

export default function LookupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [direction, setDirection] = useState(DictionaryLookupDirection.AUTO);
  const [includeExamples, setIncludeExamples] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const initialized = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [attemptBlocked, setAttemptBlocked] = useState(false);
  const [flashcardDraft, setFlashcardDraft] = useState<{
    japanese: string;
    reading: string | null;
    meaning: string;
    example?: string | null;
  } | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const initialQuery = searchParams.get('q')?.trim() ?? '';
    const initialDirection = parseLookupDirection(searchParams.get('direction'));
    setQuery(initialQuery);
    setSubmittedQuery(initialQuery);
    setDirection(initialDirection);
    setReturnTo(normalizeLookupReturnPath(searchParams.get('returnTo')));
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const focusLookup = () => inputRef.current?.focus();
    window.addEventListener('lookup:focus', focusLookup);
    return () => window.removeEventListener('lookup:focus', focusLookup);
  }, []);

  useEffect(() => {
    const syncAttemptState = () => setAttemptBlocked(hasAnyActiveExamAttempt());
    syncAttemptState();
    window.addEventListener(ACTIVE_ATTEMPT_STATE_EVENT, syncAttemptState);
    return () => window.removeEventListener(ACTIVE_ATTEMPT_STATE_EVENT, syncAttemptState);
  }, []);

  const suggestionsQuery = useQuery({
    queryKey: queryKeys.dictionarySuggestions(debouncedQuery, direction, SUGGESTION_LIMIT),
    queryFn: ({ signal }) =>
      studyApi.dictionarySuggestions(debouncedQuery, direction, SUGGESTION_LIMIT, signal),
    enabled: !attemptBlocked && suggestionsOpen && debouncedQuery.length > 0,
    staleTime: CACHE_POLICY.search.staleTime,
    gcTime: CACHE_POLICY.search.gcTime,
  });

  const lookupQuery = useQuery<DictionaryLookupResponseDto>({
    queryKey: queryKeys.dictionaryLookup(submittedQuery, direction, LOOKUP_LIMIT, includeExamples),
    queryFn: ({ signal }) =>
      studyApi.dictionaryLookup(submittedQuery, direction, LOOKUP_LIMIT, includeExamples, signal),
    enabled: !attemptBlocked && submittedQuery.length > 0,
    staleTime: CACHE_POLICY.search.staleTime,
    gcTime: CACHE_POLICY.search.gcTime,
  });

  const historyQuery = useQuery<DictionaryLookupHistoryResponseDto>({
    queryKey: queryKeys.dictionaryHistory(10),
    queryFn: ({ signal }) => studyApi.dictionaryHistory(10, signal),
    enabled: !attemptBlocked,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
  const favoritesQuery = useQuery<DictionaryFavoriteListResponseDto>({
    queryKey: queryKeys.dictionaryFavorites(20, 0),
    queryFn: ({ signal }) => studyApi.dictionaryFavorites(20, 0, signal),
    enabled: !attemptBlocked,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const performLookup = () => {
    if (hasAnyActiveExamAttempt()) {
      setAttemptBlocked(true);
      return;
    }
    const nextQuery = query.trim();
    if (!nextQuery) {
      inputRef.current?.focus();
      return;
    }
    setSubmittedQuery(nextQuery);
    setSuggestionsOpen(false);
    updateLookupUrl(router, nextQuery, direction, returnTo);
  };

  const submitLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    performLookup();
  };

  const selectSuggestion = (value: string) => {
    if (hasAnyActiveExamAttempt()) {
      setAttemptBlocked(true);
      return;
    }
    setQuery(value);
    setSubmittedQuery(value);
    setSuggestionsOpen(false);
    updateLookupUrl(router, value, direction, returnTo);
  };

  const isNoResult =
    lookupQuery.error instanceof ApiError && lookupQuery.error.code === 'NO_RESULT';
  const hasResult = hasDictionaryResult(lookupQuery.data);
  const suggestions = suggestionsQuery.data?.suggestions ?? [];
  const lookupCard = lookupQuery.data ? getLookupPrimaryCard(lookupQuery.data) : null;
  const matchingFavorite =
    lookupQuery.data && lookupCard
      ? favoritesQuery.data?.items.find(
          (item) =>
            item.term === lookupCard.japanese &&
            item.reading === lookupCard.reading &&
            item.direction === lookupQuery.data?.direction,
        )
      : undefined;
  const activeFavoriteId = favoriteId ?? matchingFavorite?.id ?? null;

  useEffect(() => {
    if (!lookupQuery.data) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.dictionaryHistory(10) });
  }, [lookupQuery.data, queryClient]);

  useEffect(() => {
    setFavoriteId(null);
    setFavoriteMessage(null);
    setFavoriteError(null);
  }, [submittedQuery, direction]);

  const toggleFavorite = async () => {
    if (!lookupQuery.data || lookupQuery.data.direction === DictionaryLookupDirection.AUTO) return;
    const primary = lookupQuery.data.results[0];
    const source = primary?.source ?? lookupQuery.data.kanji?.source ?? lookupQuery.data.sources[0];
    const card = getLookupPrimaryCard(lookupQuery.data);
    if (!source || !card.meaning) {
      setFavoriteError('Kết quả này chưa có đủ nghĩa hoặc nguồn để lưu.');
      return;
    }
    setFavoriteBusy(true);
    setFavoriteMessage(null);
    setFavoriteError(null);
    try {
      if (activeFavoriteId) {
        await studyApi.removeDictionaryFavorite(activeFavoriteId);
        setFavoriteId(null);
        queryClient.setQueryData<DictionaryFavoriteListResponseDto>(
          queryKeys.dictionaryFavorites(20, 0),
          (current) =>
            current
              ? {
                  ...current,
                  items: current.items.filter((item) => item.id !== activeFavoriteId),
                  total: Math.max(0, current.total - 1),
                }
              : current,
        );
        setFavoriteMessage('Đã bỏ khỏi yêu thích.');
      } else {
        const saved = await studyApi.saveDictionaryFavorite({
          term: card.japanese,
          reading: card.reading,
          meaningSummary: card.meaning.slice(0, 512),
          direction: lookupQuery.data.direction,
          source,
        });
        setFavoriteId(saved.id);
        queryClient.setQueryData<DictionaryFavoriteListResponseDto>(
          queryKeys.dictionaryFavorites(20, 0),
          (current) =>
            current
              ? {
                  ...current,
                  items: [saved, ...current.items.filter((item) => item.id !== saved.id)].slice(
                    0,
                    20,
                  ),
                  total: current.total + 1,
                }
              : current,
        );
        setFavoriteMessage('Đã lưu vào yêu thích.');
      }
    } catch (error: unknown) {
      setFavoriteError(getApiErrorMessage(error, 'Không thể cập nhật yêu thích.'));
    } finally {
      setFavoriteBusy(false);
    }
  };

  const openFlashcardDialog = () => {
    if (!lookupQuery.data) return;
    const card = getLookupPrimaryCard(lookupQuery.data);
    setFlashcardDraft({
      ...card,
      example: lookupQuery.data.examples[0]
        ? `${lookupQuery.data.examples[0].japaneseSentence}\n${lookupQuery.data.examples[0].vietnameseTranslation}`
        : null,
    });
  };

  const selectSavedLookup = (nextQuery: string, nextDirection: DictionaryLookupDirection) => {
    if (hasAnyActiveExamAttempt()) {
      setAttemptBlocked(true);
      return;
    }
    setQuery(nextQuery);
    setSubmittedQuery(nextQuery);
    setDirection(nextDirection);
    setSuggestionsOpen(false);
    updateLookupUrl(router, nextQuery, nextDirection);
  };

  const clearHistory = () => {
    if (hasAnyActiveExamAttempt()) {
      setAttemptBlocked(true);
      return;
    }
    if (!window.confirm('Xóa toàn bộ lịch sử tra cứu?')) return;
    void (async () => {
      try {
        await studyApi.clearDictionaryHistory();
        queryClient.setQueryData<DictionaryLookupHistoryResponseDto>(
          queryKeys.dictionaryHistory(10),
          { items: [], total: 0 },
        );
      } catch (error: unknown) {
        setFavoriteError(getApiErrorMessage(error, 'Không thể xóa lịch sử tra cứu.'));
      }
    })();
  };

  const removeFavorite = (id: string) => {
    if (hasAnyActiveExamAttempt()) {
      setAttemptBlocked(true);
      return;
    }
    void (async () => {
      try {
        await studyApi.removeDictionaryFavorite(id);
        queryClient.setQueryData<DictionaryFavoriteListResponseDto>(
          queryKeys.dictionaryFavorites(20, 0),
          (current) =>
            current
              ? {
                  ...current,
                  items: current.items.filter((item) => item.id !== id),
                  total: Math.max(0, current.total - 1),
                }
              : current,
        );
        if (activeFavoriteId === id) setFavoriteId(null);
      } catch (error: unknown) {
        setFavoriteError(getApiErrorMessage(error, 'Không thể bỏ yêu thích.'));
      }
    })();
  };

  if (attemptBlocked) {
    return (
      <main
        role="alert"
        style={{ maxWidth: '760px', margin: '0 auto', padding: '5rem 1.5rem', textAlign: 'center' }}
      >
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Tra cứu đang tạm khóa
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Bạn chỉ có thể dùng Lookup sau khi nộp bài và xem kết quả đã chấm. Bài thi hiện tại vẫn
          được lưu trên máy chủ; hãy quay lại bài thi để tiếp tục.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            marginTop: '1rem',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: 0,
            background: 'var(--gradient-brand)',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          Quay lại bài thi
        </button>
      </main>
    );
  }

  return (
    <main
      aria-busy={lookupQuery.isPending || suggestionsQuery.isFetching}
      style={{ maxWidth: '1040px', margin: '0 auto', padding: '2.25rem 1.5rem 5rem' }}
    >
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: 'var(--accent-cyan)',
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            marginBottom: '0.65rem',
          }}
        >
          <Languages size={15} />
          <span>NHẬT ↔ VIỆT</span>
        </div>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '2.25rem', marginBottom: '0.6rem' }}>
          Tra cứu từ điển
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '620px', margin: '0 auto' }}>
          Tra cứu nhanh từ vựng Nhật–Việt, cách đọc và thông tin kanji trong Study Hub.
        </p>
      </header>

      <section className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={submitLookup} role="search" aria-label="Dictionary lookup">
          <div style={{ position: 'relative' }}>
            <Search
              size={21}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--accent-cyan)',
                pointerEvents: 'none',
              }}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSuggestionsOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  if (event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  performLookup();
                  return;
                }
                if (event.key === 'Escape') setSuggestionsOpen(false);
              }}
              placeholder="Nhập 日本語 hoặc tiếng Việt…"
              aria-label="Từ cần tra cứu"
              aria-autocomplete="list"
              aria-controls="lookup-suggestions"
              autoComplete="off"
              style={{
                width: '100%',
                padding: '1rem 7.25rem 1rem 3rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(15, 23, 42, 0.85)',
                color: 'var(--text-primary)',
                fontSize: '1.1rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              aria-label="Tra cứu"
              style={{
                position: 'absolute',
                right: '0.45rem',
                top: '0.45rem',
                bottom: '0.45rem',
                padding: '0 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--gradient-brand)',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              Tra cứu
            </button>
          </div>

          {suggestionsOpen && suggestions.length > 0 && (
            <div
              id="lookup-suggestions"
              role="listbox"
              aria-label="Gợi ý tra cứu"
              style={{
                marginTop: '0.5rem',
                display: 'grid',
                gap: '0.25rem',
                maxHeight: '15rem',
                overflowY: 'auto',
                padding: '0.35rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(15, 23, 42, 0.98)',
              }}
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.text}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion.text)}
                  style={{
                    textAlign: 'left',
                    padding: '0.55rem 0.7rem',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {suggestion.text}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              marginTop: '0.9rem',
            }}
          >
            <div
              role="group"
              aria-label="Hướng tra cứu"
              style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}
            >
              {DIRECTION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDirection(option.value)}
                  aria-pressed={direction === option.value}
                  title={option.hint}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.7rem',
                    borderRadius: 'var(--radius-sm)',
                    border:
                      direction === option.value
                        ? '1px solid rgba(56, 189, 248, 0.55)'
                        : '1px solid var(--border-subtle)',
                    background:
                      direction === option.value ? 'rgba(56, 189, 248, 0.13)' : 'transparent',
                    color:
                      direction === option.value ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    fontWeight: direction === option.value ? 700 : 500,
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
              }}
            >
              <input
                type="checkbox"
                checked={includeExamples}
                onChange={(event) => setIncludeExamples(event.target.checked)}
              />
              Thêm ví dụ Nhật–Việt
            </label>
          </div>
        </form>
      </section>

      <LookupSavedItems
        history={historyQuery.data}
        favorites={favoritesQuery.data}
        isLoading={historyQuery.isLoading || favoritesQuery.isLoading}
        error={
          historyQuery.error || favoritesQuery.error
            ? getApiErrorMessage(
                historyQuery.error ?? favoritesQuery.error,
                'Không thể tải mục đã lưu.',
              )
            : null
        }
        onHistorySelect={selectSavedLookup}
        onFavoriteSelect={selectSavedLookup}
        onClearHistory={clearHistory}
        onRemoveFavorite={removeFavorite}
      />

      {submittedQuery.length === 0 && (
        <section className="glass-panel" style={{ padding: '2.4rem 1.5rem', textAlign: 'center' }}>
          <Sparkles size={30} style={{ color: 'var(--accent-purple)', marginBottom: '0.8rem' }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Bắt đầu với một từ hoặc cụm từ
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Gợi ý xuất hiện sau khi bạn nhập; Enter để tra cứu nhanh.
          </p>
        </section>
      )}

      {lookupQuery.isPending && submittedQuery.length > 0 && (
        <section
          role="status"
          className="glass-panel"
          style={{ padding: '2rem', textAlign: 'center' }}
        >
          <RotateCw size={24} className="lookup-spin" style={{ color: 'var(--accent-cyan)' }} />
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>Đang tra cứu…</p>
        </section>
      )}

      {lookupQuery.isError && submittedQuery.length > 0 && (
        <section
          role="alert"
          className="glass-panel"
          style={{ padding: '2rem', textAlign: 'center', borderColor: 'rgba(244, 63, 94, 0.35)' }}
        >
          <h2 style={{ color: isNoResult ? 'var(--text-primary)' : 'var(--accent-rose)' }}>
            {isNoResult ? 'Không tìm thấy kết quả' : 'Không thể hoàn tất tra cứu'}
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.65rem 0 1.2rem' }}>
            {isNoResult
              ? 'Thử dạng chữ khác hoặc đổi hướng tra cứu.'
              : getApiErrorMessage(lookupQuery.error, 'Vui lòng thử lại sau.')}
          </p>
          {!isNoResult && (
            <button
              type="button"
              onClick={() => void lookupQuery.refetch()}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-brand)',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              Thử lại
            </button>
          )}
        </section>
      )}

      {lookupQuery.data && hasResult && (
        <LookupResults
          result={lookupQuery.data}
          isFavorite={activeFavoriteId !== null}
          favoriteBusy={favoriteBusy}
          favoriteMessage={favoriteMessage}
          favoriteError={favoriteError}
          onFavorite={() => void toggleFavorite()}
          onAddToFlashcard={openFlashcardDialog}
        />
      )}

      <LookupFlashcardDialog
        draft={flashcardDraft}
        onClose={() => setFlashcardDraft(null)}
        onSaved={() => setFlashcardDraft(null)}
      />

      <style jsx>{`
        .lookup-spin {
          animation: lookup-spin 1s linear infinite;
        }
        @keyframes lookup-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (max-width: 640px) {
          h1 {
            font-size: 1.8rem !important;
          }
        }
      `}</style>
    </main>
  );
}
